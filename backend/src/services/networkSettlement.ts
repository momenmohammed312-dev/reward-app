import { Queue, Worker } from 'bullmq';
import db from '../config/db.js';
import { isRedisReady } from '../config/redis.js';
import { roundEgpAmount } from '../helpers/networkRates.js';
import { logger } from './logger.js';
import { NetworkError } from './network.js';

export type SettlementMethod = 'bank_transfer' | 'subscription_deduction';

interface SettlementJobPayload {
  settlementId: string;
}

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

let settlementQueueInstance: Queue<SettlementJobPayload> | null = null;
let settlementWorkerInstance: Worker<SettlementJobPayload> | null = null;

export function getSettlementQueue(): Queue<SettlementJobPayload> | null {
  if (!isRedisReady()) return null;
  if (!settlementQueueInstance) {
    settlementQueueInstance = new Queue<SettlementJobPayload>('network-settlements', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });
  }
  return settlementQueueInstance;
}

export function startSettlementWorker(): Worker<SettlementJobPayload> | null {
  if (!isRedisReady()) return null;
  if (!settlementWorkerInstance) {
    settlementWorkerInstance = new Worker<SettlementJobPayload>(
      'network-settlements',
      async (job) => {
        await NetworkSettlementService.processSettlementJob(job.data.settlementId);
      },
      { connection: redisConnection }
    );
  }
  return settlementWorkerInstance;
}

export class NetworkSettlementService {
  /**
   * Lists net owed balances per tenant pair from completed unsettled cross-tenant redemptions.
   */
  static async getPendingNetPositions(networkId: string, scopedTenantId?: string) {
    const scopeFilter = scopedTenantId
      ? 'AND (p.debtor_tenant_id = $2::uuid OR p.creditor_tenant_id = $2::uuid)'
      : '';
    const params = scopedTenantId ? [networkId, scopedTenantId] : [networkId];

    const result = await db.query(
      `SELECT
         p.network_id,
         p.debtor_tenant_id,
         dt.name AS debtor_tenant_name,
         p.creditor_tenant_id,
         ct.name AS creditor_tenant_name,
         p.pending_redemptions_count,
         p.owed_egp::float8 AS owed_egp
       FROM network_tenant_net_positions p
       JOIN tenants dt ON dt.id = p.debtor_tenant_id
       JOIN tenants ct ON ct.id = p.creditor_tenant_id
       WHERE p.network_id = $1::uuid ${scopeFilter}
       ORDER BY p.owed_egp DESC`,
      params
    );
    return result.rows;
  }

  /**
   * Lists historical and active settlements for a network (optionally scoped to a member tenant).
   */
  static async getNetworkSettlements(networkId: string, scopedTenantId?: string) {
    const scopeFilter = scopedTenantId
      ? 'AND (s.from_tenant_id = $2::uuid OR s.to_tenant_id = $2::uuid)'
      : '';
    const params = scopedTenantId ? [networkId, scopedTenantId] : [networkId];

    const result = await db.query(
      `SELECT
         s.*,
         ft.name AS from_tenant_name,
         tt.name AS to_tenant_name
       FROM settlements s
       JOIN tenants ft ON ft.id = s.from_tenant_id
       JOIN tenants tt ON tt.id = s.to_tenant_id
       WHERE s.network_id = $1::uuid ${scopeFilter}
       ORDER BY s.created_at DESC
       LIMIT 100`,
      params
    );
    return result.rows;
  }

  /**
   * Creates a settlement batch locking all unsettled redemptions between two tenants.
   */
  static async createSettlement(params: {
    networkId: string;
    fromTenantId: string;
    toTenantId: string;
    method: SettlementMethod;
    idempotencyKey?: string;
  }) {
    const { networkId, fromTenantId, toTenantId, method, idempotencyKey } = params;

    if (fromTenantId === toTenantId) {
      throw new NetworkError('SAME_TENANT_REDEMPTION', 'from_tenant_id and to_tenant_id must be different');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      if (idempotencyKey) {
        const existingRes = await client.query(
          `SELECT * FROM settlements WHERE idempotency_key = $1`,
          [idempotencyKey]
        );
        if (existingRes.rows.length > 0) {
          await client.query('ROLLBACK');
          return { settlement: existingRes.rows[0], idempotentReplay: true };
        }
      }

      // Lock unsettled cross-tenant redemptions for this debtor -> creditor pair
      const pendingRes = await client.query(
        `SELECT id, egp_value::float8 AS egp_value
         FROM cross_tenant_redemptions
         WHERE network_id = $1::uuid
           AND source_tenant_id = $2::uuid
           AND target_tenant_id = $3::uuid
           AND status = 'completed'
         FOR UPDATE`,
        [networkId, fromTenantId, toTenantId]
      );

      if (pendingRes.rows.length === 0) {
        throw new NetworkError(
          'NO_PENDING_REDEMPTIONS',
          'No unsettled cross-tenant redemptions found for this tenant pair'
        );
      }

      const rawTotal = pendingRes.rows.reduce((sum, r) => sum + Number(r.egp_value), 0);
      const amountEgp = roundEgpAmount(rawTotal);

      const settlementRes = await client.query(
        `INSERT INTO settlements (network_id, from_tenant_id, to_tenant_id, amount_egp, currency, method, status, idempotency_key)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, 'EGP', $5::settlement_method, 'pending', $6)
         RETURNING *`,
        [networkId, fromTenantId, toTenantId, amountEgp, method, idempotencyKey || null]
      );
      const settlement = settlementRes.rows[0];

      for (const item of pendingRes.rows) {
        await client.query(
          `INSERT INTO settlement_items (settlement_id, cross_redemption_id, amount_egp)
           VALUES ($1::uuid, $2::uuid, $3)`,
          [settlement.id, item.id, roundEgpAmount(Number(item.egp_value))]
        );
        await client.query(
          `UPDATE cross_tenant_redemptions SET status = 'settled' WHERE id = $1::uuid`,
          [item.id]
        );
      }

      await client.query('COMMIT');

      const queue = getSettlementQueue();
      if (queue) {
        await queue.add(
          'process-settlement',
          { settlementId: settlement.id },
          { jobId: `settlement_${settlement.id}` }
        );
      }

      return { settlement, itemsCount: pendingRes.rows.length, idempotentReplay: false };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Executes a queued settlement either via bank transfer reference or subscription billing deduction.
   */
  static async processSettlementJob(settlementId: string) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `SELECT * FROM settlements WHERE id = $1::uuid FOR UPDATE`,
        [settlementId]
      );
      if (res.rows.length === 0) {
        throw new NetworkError('SETTLEMENT_NOT_FOUND', 'Settlement not found');
      }

      const settlement = res.rows[0];
      if (settlement.status === 'completed') {
        await client.query('ROLLBACK');
        return settlement;
      }

      let billingHistoryId: string | null = null;
      let externalRef: string | null = settlement.external_reference || null;

      if (settlement.method === 'subscription_deduction') {
        const subRes = await client.query(
          `SELECT id, status FROM subscriptions WHERE tenant_id = $1::uuid`,
          [settlement.from_tenant_id]
        );
        if (subRes.rows.length === 0) {
          throw new NetworkError('SUBSCRIPTION_NOT_FOUND', 'Debtor tenant has no active subscription record');
        }

        const billRes = await client.query(
          `INSERT INTO billing_history (tenant_id, amount, currency, status, paid_at)
           VALUES ($1::uuid, $2, 'EGP', 'paid', NOW())
           RETURNING id`,
          [settlement.from_tenant_id, settlement.amount_egp]
        );
        billingHistoryId = billRes.rows[0].id;
        externalRef = `SUB-DEDUCT-${settlement.id.slice(0, 8).toUpperCase()}`;
      } else {
        externalRef = externalRef || `BANK-${settlement.id.slice(0, 8).toUpperCase()}`;
      }

      const updatedRes = await client.query(
        `UPDATE settlements
         SET status = 'completed',
             billing_history_id = $2::uuid,
             external_reference = $3,
             settled_at = NOW(),
             updated_at = NOW()
         WHERE id = $1::uuid
         RETURNING *`,
        [settlement.id, billingHistoryId, externalRef]
      );

      await client.query(
        `INSERT INTO network_points_ledger
           (network_id, tenant_id, counterparty_tenant_id, type, points, egp_value, idempotency_key, note)
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'settlement', 1, $4, $5, $6)
         ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
        [
          settlement.network_id,
          settlement.from_tenant_id,
          settlement.to_tenant_id,
          settlement.amount_egp,
          `xnet-settle:${settlement.id}`,
          `Settlement completed (${settlement.method}) ref=${externalRef}`,
        ]
      );

      await client.query('COMMIT');
      logger.info('Network settlement completed', {
        settlementId: settlement.id,
        method: settlement.method,
        amountEgp: settlement.amount_egp,
      });
      return updatedRes.rows[0];
    } catch (err: unknown) {
      await client.query('ROLLBACK');
      const msg = err instanceof Error ? err.message : String(err);
      await db.query(
        `UPDATE settlements SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1::uuid`,
        [settlementId, msg]
      );
      throw err;
    } finally {
      client.release();
    }
  }
}
