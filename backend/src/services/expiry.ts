import { PoolClient } from 'pg';
import db from '../config/db.js';
import { LedgerService } from './ledger.js';
import { logger } from './logger.js';

const RUN_DELAY_MS = 60 * 1000;
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface PendingCredit {
  id: string;
  points: number;
  expiresAt: number;
}

export interface LedgerEntryLite {
  id: string;
  type: string;
  points: number;
  created_at: Date | string;
}

export interface ExpiringCredit {
  ledgerId: string;
  points: number;
}

/**
 * Pure FIFO expiry calculation over a customer's ledger.
 *
 * Credits (earned/bonus/refund) are consumed oldest-first by later redemptions
 * and expirations. Returns the remaining points of every credit that outlived
 * its expiry window. Exposed for unit testing.
 */
export function computeExpiredPoints(entries: LedgerEntryLite[], expiryDays: number, nowMs: number): ExpiringCredit[] {
  const pending: PendingCredit[] = [];
  const expirations: ExpiringCredit[] = [];

  for (const entry of entries) {
    if (entry.type === 'redeemed' || entry.type === 'expired') {
      // Negative entries consume the oldest credits first (FIFO)
      let toConsume = Number(entry.points);
      while (toConsume > 0 && pending.length > 0) {
        const head = pending[0];
        const consumed = Math.min(head.points, toConsume);
        head.points -= consumed;
        toConsume -= consumed;
        if (head.points === 0) {
          pending.shift();
        }
      }
      continue;
    }

    if (entry.type !== 'earned' && entry.type !== 'bonus' && entry.type !== 'refund') {
      continue;
    }

    const expiresAt = new Date(entry.created_at).getTime() + expiryDays * MS_PER_DAY;
    pending.push({ id: entry.id, points: Number(entry.points), expiresAt });
  }

  for (const credit of pending) {
    if (credit.points > 0 && credit.expiresAt < nowMs) {
      expirations.push({ ledgerId: credit.id, points: credit.points });
    }
  }

  return expirations;
}

/**
 * Enforces per-tenant points_expiry_days.
 *
 * Credits (earned/bonus/refund) are consumed FIFO by later redemptions and
 * expirations. A daily job walks each customer's ledger in chronological
 * order, consumes the oldest credits against redemptions, and writes an
 * 'expired' ledger entry for any credit that outlived its expiry window.
 * Every expiration is guarded by an idempotency key, so re-runs never
 * double-expire.
 */
export class ExpiryService {
  static async expireAllTenants() {
    const tenantsRes = await db.query(
      `SELECT id, points_expiry_days
       FROM tenants
       WHERE is_active = true
         AND points_expiry_days IS NOT NULL
         AND points_expiry_days > 0`
    );

    for (const t of tenantsRes.rows) {
      try {
        await ExpiryService.expireTenant(t.id, Number(t.points_expiry_days));
      } catch (err) {
        logger.error(`Points expiry failed for tenant ${t.id}`, { error: (err as Error).message });
      }
    }
  }

  static async expireTenant(tenantId: string, expiryDays: number) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const customersRes = await client.query(
        `SELECT DISTINCT wl.customer_id
         FROM wallet_ledger wl
         WHERE wl.tenant_id = $1::uuid
           AND wl.type IN ('earned', 'bonus', 'refund')`,
        [tenantId]
      );

      for (const row of customersRes.rows) {
        await ExpiryService.expireCustomer(client, tenantId, row.customer_id, expiryDays);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private static async expireCustomer(client: PoolClient, tenantId: string, customerId: string, expiryDays: number) {
    const ledgerRes = await client.query(
      `SELECT id, type, points, created_at
       FROM wallet_ledger
       WHERE tenant_id = $1::uuid AND customer_id = $2::uuid AND points > 0
       ORDER BY created_at ASC, id ASC`,
      [tenantId, customerId]
    );

    const expirations = computeExpiredPoints(ledgerRes.rows, expiryDays, Date.now());

    for (const exp of expirations) {
      await LedgerService.insert(client, {
        tenantId,
        customerId,
        type: 'expired',
        points: exp.points,
        referenceId: exp.ledgerId,
        referenceType: 'expiry',
        note: 'Points expired',
        idempotencyKey: `expiry:${exp.ledgerId}`,
      });
    }
  }

  /**
   * Starts the daily expiry scheduler. Runs shortly after boot, then every 24h.
   */
  static startScheduler() {
    const run = () => {
      ExpiryService.expireAllTenants()
        .then(() => logger.info('Points expiry job completed'))
        .catch((err) => logger.error('Points expiry job failed', { error: (err as Error).message }));
    };

    setTimeout(run, RUN_DELAY_MS);
    setInterval(run, RUN_INTERVAL_MS);
    logger.info('Points expiry scheduler started (runs daily)');
  }
}
