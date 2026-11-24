import db from '../config/db.js';
import { calculateCrossTenantPoints, CrossTenantConversion } from '../helpers/networkRates.js';
import { LedgerService } from './ledger.js';
import { NetworkError, NetworkService } from './network.js';

export interface NetworkRateRow {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  egp_per_point: number | null;
  is_active: boolean;
  updated_at: string | null;
}

export interface CrossTenantRedeemParams {
  networkId: string;
  sourceTenantId: string;
  sourceCustomerId: string;
  targetTenantId: string;
  targetRewardId: string;
  sourcePoints: number;
  idempotencyKey?: string;
}

export class NetworkExchangeService {
  /**
   * Lists exchange rates for all active members in a network.
   */
  static async getNetworkRates(networkId: string): Promise<NetworkRateRow[]> {
    const result = await db.query(
      `SELECT
         nm.tenant_id,
         t.name AS tenant_name,
         t.slug AS tenant_slug,
         per.egp_per_point::float8 AS egp_per_point,
         COALESCE(per.is_active, false) AS is_active,
         per.updated_at
       FROM network_memberships nm
       JOIN tenants t ON t.id = nm.tenant_id
       LEFT JOIN point_exchange_rates per
         ON per.network_id = nm.network_id AND per.tenant_id = nm.tenant_id
       WHERE nm.network_id = $1::uuid AND nm.status = 'active'
       ORDER BY t.name ASC`,
      [networkId]
    );
    return result.rows;
  }

  /**
   * Sets or updates a member tenant's EGP valuation per point in a network.
   */
  static async upsertTenantRate(
    networkId: string,
    tenantId: string,
    egpPerPoint: number,
    updatedBy?: string
  ) {
    if (!Number.isFinite(egpPerPoint) || egpPerPoint <= 0) {
      throw new NetworkError('INVALID_RATE', 'egp_per_point must be greater than 0');
    }

    const isMember = await NetworkService.isMember(networkId, tenantId);
    if (!isMember) {
      throw new NetworkError('NOT_NETWORK_MEMBER', 'Tenant is not an active member of this network');
    }

    const result = await db.query(
      `INSERT INTO point_exchange_rates (network_id, tenant_id, egp_per_point, is_active, updated_by)
       VALUES ($1::uuid, $2::uuid, $3, true, $4::uuid)
       ON CONFLICT (network_id, tenant_id) DO UPDATE SET
         egp_per_point = EXCLUDED.egp_per_point,
         is_active = true,
         updated_by = EXCLUDED.updated_by,
         updated_at = NOW()
       RETURNING id, network_id, tenant_id, egp_per_point::float8 AS egp_per_point, is_active, updated_at`,
      [networkId, tenantId, egpPerPoint, updatedBy || null]
    );

    return result.rows[0];
  }

  /**
   * Computes a non-mutating conversion preview between two active network members.
   */
  static async previewConversion(
    networkId: string,
    sourceTenantId: string,
    targetTenantId: string,
    sourcePoints: number
  ): Promise<CrossTenantConversion> {
    if (sourceTenantId === targetTenantId) {
      throw new NetworkError('SAME_TENANT_REDEMPTION', 'Source and target tenants must be different');
    }

    const [sourceMember, targetMember] = await Promise.all([
      NetworkService.isMember(networkId, sourceTenantId),
      NetworkService.isMember(networkId, targetTenantId),
    ]);
    if (!sourceMember || !targetMember) {
      throw new NetworkError('NOT_NETWORK_MEMBER', 'Both tenants must be active members of the network');
    }

    const ratesRes = await db.query(
      `SELECT tenant_id, egp_per_point::float8 AS egp_per_point
       FROM point_exchange_rates
       WHERE network_id = $1::uuid
         AND tenant_id IN ($2::uuid, $3::uuid)
         AND is_active = true`,
      [networkId, sourceTenantId, targetTenantId]
    );

    const rateMap = new Map<string, number>();
    for (const r of ratesRes.rows) {
      rateMap.set(r.tenant_id, Number(r.egp_per_point));
    }

    const sourceRate = rateMap.get(sourceTenantId);
    const targetRate = rateMap.get(targetTenantId);

    if (!sourceRate || !targetRate) {
      throw new NetworkError('RATE_NOT_CONFIGURED', 'Exchange rates must be configured for both tenants');
    }

    return calculateCrossTenantPoints(sourcePoints, sourceRate, targetRate);
  }

  /**
   * Atomically redeems source tenant points for a target tenant reward inside the same network.
   * Debits source customer's wallet_ledger via LedgerService, issues a redemption code on the target
   * tenant, and writes balanced entries in cross_tenant_redemptions & network_points_ledger.
   */
  static async redeemAcrossNetwork(params: CrossTenantRedeemParams) {
    const {
      networkId,
      sourceTenantId,
      sourceCustomerId,
      targetTenantId,
      targetRewardId,
      sourcePoints,
      idempotencyKey,
    } = params;

    if (sourceTenantId === targetTenantId) {
      throw new NetworkError('SAME_TENANT_REDEMPTION', 'Source and target tenants must be different');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Idempotency replay check
      if (idempotencyKey) {
        const existingRes = await client.query(
          `SELECT ctr.*, r.code AS redemption_code, r.expires_at
           FROM cross_tenant_redemptions ctr
           LEFT JOIN redemptions r ON r.id = ctr.redemption_id
           WHERE ctr.idempotency_key = $1`,
          [idempotencyKey]
        );
        if (existingRes.rows.length > 0) {
          await client.query('ROLLBACK');
          return { ...existingRes.rows[0], idempotentReplay: true };
        }
      }

      // 2. Verify active network & memberships
      const memberRes = await client.query(
        `SELECT nm.tenant_id
         FROM network_memberships nm
         JOIN networks n ON n.id = nm.network_id
         WHERE nm.network_id = $1::uuid
           AND n.is_active = true
           AND nm.status = 'active'
           AND nm.tenant_id IN ($2::uuid, $3::uuid)`,
        [networkId, sourceTenantId, targetTenantId]
      );
      if (memberRes.rows.length < 2) {
        throw new NetworkError('NOT_NETWORK_MEMBER', 'Both tenants must belong to an active network');
      }

      // 3. Load exchange rates & compute conversion
      const ratesRes = await client.query(
        `SELECT tenant_id, egp_per_point::float8 AS egp_per_point
         FROM point_exchange_rates
         WHERE network_id = $1::uuid
           AND tenant_id IN ($2::uuid, $3::uuid)
           AND is_active = true`,
        [networkId, sourceTenantId, targetTenantId]
      );
      const rateMap = new Map<string, number>();
      for (const r of ratesRes.rows) rateMap.set(r.tenant_id, Number(r.egp_per_point));

      const sourceRate = rateMap.get(sourceTenantId);
      const targetRate = rateMap.get(targetTenantId);
      if (!sourceRate || !targetRate) {
        throw new NetworkError('RATE_NOT_CONFIGURED', 'Exchange rates must be configured for both tenants');
      }

      const conversion = calculateCrossTenantPoints(sourcePoints, sourceRate, targetRate);
      if (conversion.targetPointsEquivalent <= 0) {
        throw new NetworkError('INSUFFICIENT_EQUIVALENT_POINTS', 'Converted points are below minimum unit value');
      }

      // 4. Lock source customer & enforce OTP verification + sufficient balance
      const custRes = await client.query(
        `SELECT c.id, c.phone, c.name, c.is_verified, COALESCE(cb.current_balance, 0) AS points_balance
         FROM customers c
         LEFT JOIN customer_balances cb ON c.id = cb.customer_id AND cb.tenant_id = c.tenant_id
         WHERE c.id = $1::uuid AND c.tenant_id = $2::uuid AND c.deleted_at IS NULL
         FOR UPDATE OF c`,
        [sourceCustomerId, sourceTenantId]
      );
      if (custRes.rows.length === 0) {
        throw new NetworkError('CUSTOMER_NOT_FOUND', 'Source customer not found');
      }
      const customer = custRes.rows[0];
      if (!customer.is_verified) {
        throw new NetworkError('CUSTOMER_NOT_VERIFIED', 'Customer phone must be verified via OTP');
      }
      if (Number(customer.points_balance) < sourcePoints) {
        throw new NetworkError('INSUFFICIENT_BALANCE', 'Insufficient points balance');
      }

      // 5. Atomically reserve target reward
      const rewardRes = await client.query(
        `UPDATE rewards
         SET current_redemptions = COALESCE(current_redemptions, 0) + 1,
             updated_at = NOW()
         WHERE id = $1::uuid
           AND tenant_id = $2::uuid
           AND deleted_at IS NULL
           AND is_active = true
           AND (max_redemptions IS NULL OR COALESCE(current_redemptions, 0) < max_redemptions)
         RETURNING id, name, required_points, code_validity_hours`,
        [targetRewardId, targetTenantId]
      );
      if (rewardRes.rows.length === 0) {
        throw new NetworkError('REWARD_UNAVAILABLE', 'Target reward is inactive or limit reached');
      }
      const reward = rewardRes.rows[0];
      if (conversion.targetPointsEquivalent < Number(reward.required_points)) {
        throw new NetworkError(
          'INSUFFICIENT_EQUIVALENT_POINTS',
          `Converted value (${conversion.targetPointsEquivalent}) is below required reward points (${reward.required_points})`
        );
      }

      // 6. Generate target redemption record scoped strictly to a target-tenant customer row
      const linkedTargetRes = await client.query(
        `SELECT l2.customer_id
         FROM network_customer_links l1
         JOIN network_customers nc ON nc.id = l1.network_customer_id
         JOIN network_customer_links l2 ON l2.network_customer_id = l1.network_customer_id
         WHERE nc.network_id = $1::uuid
           AND l1.customer_id = $2::uuid
           AND l2.tenant_id = $3::uuid
         LIMIT 1`,
        [networkId, sourceCustomerId, targetTenantId]
      );
      let targetCustomerId: string | undefined = linkedTargetRes.rows[0]?.customer_id;

      if (!targetCustomerId) {
        if (!customer.phone) {
          throw new NetworkError('CUSTOMER_NOT_FOUND', 'Source customer phone not found');
        }
        // Provision or reuse a tenant-owned customer row by phone so target redemptions never reference another tenant's PII row.
        const targetCustRes = await client.query(
          `INSERT INTO customers (tenant_id, phone, name, is_verified)
           VALUES ($1::uuid, $2, $3, false)
           ON CONFLICT (tenant_id, phone) DO UPDATE SET
             deleted_at = NULL,
             updated_at = NOW()
           RETURNING id`,
          [targetTenantId, customer.phone, customer.name || null]
        );
        targetCustomerId = targetCustRes.rows[0].id;
      }

      const codeRes = await client.query('SELECT generate_redemption_code() AS code');
      const redemptionCode = codeRes.rows[0].code;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + Number(reward.code_validity_hours ?? 24));

      const redRes = await client.query(
        `INSERT INTO redemptions (tenant_id, customer_id, reward_id, code, points_used, expires_at)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
         RETURNING id, code`,
        [targetTenantId, targetCustomerId, targetRewardId, redemptionCode, Number(reward.required_points), expiresAt]
      );
      const redemptionId = redRes.rows[0].id;

      // 7. Create cross_tenant_redemptions audit record
      const rateSnapshot = {
        sourceEgpPerPoint: sourceRate,
        targetEgpPerPoint: targetRate,
      };
      const crossRes = await client.query(
        `INSERT INTO cross_tenant_redemptions
           (network_id, source_tenant_id, target_tenant_id, source_customer_id, target_reward_id,
            redemption_id, source_points_spent, target_points_equivalent, egp_value, rate_snapshot, status, idempotency_key)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::uuid, $7, $8, $9, $10::jsonb, 'completed', $11)
         RETURNING *`,
        [
          networkId,
          sourceTenantId,
          targetTenantId,
          sourceCustomerId,
          targetRewardId,
          redemptionId,
          sourcePoints,
          conversion.targetPointsEquivalent,
          conversion.egpValue,
          JSON.stringify(rateSnapshot),
          idempotencyKey || null,
        ]
      );
      const crossRedemption = crossRes.rows[0];

      // 8. Debit source tenant customer ledger via single sanctioned write path
      await LedgerService.insert(client, {
        tenantId: sourceTenantId,
        customerId: sourceCustomerId,
        type: 'redeemed',
        points: sourcePoints,
        referenceId: crossRedemption.id,
        referenceType: 'cross_tenant_redemption',
        note: `Cross-network reward redemption (${reward.name})`,
        idempotencyKey: idempotencyKey ? `xnet-src:${idempotencyKey}` : `xnet-src:${crossRedemption.id}`,
      });

      // 9. Write balanced double-entry rows into network_points_ledger
      await client.query(
        `INSERT INTO network_points_ledger
           (network_id, tenant_id, counterparty_tenant_id, customer_id, cross_redemption_id, type, points, egp_value, idempotency_key, note)
         VALUES
           ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, 'redeem', $6, $7, $8, $9),
           ($1::uuid, $3::uuid, $2::uuid, $10::uuid, $5::uuid, 'earn', $11, $7, $12, $13)
         ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
        [
          networkId,
          sourceTenantId,
          targetTenantId,
          sourceCustomerId,
          crossRedemption.id,
          sourcePoints,
          conversion.egpValue,
          `xnet-ledger-src:${crossRedemption.id}`,
          `Cross-tenant debit for reward ${reward.name}`,
          targetCustomerId,
          conversion.targetPointsEquivalent,
          `xnet-ledger-tgt:${crossRedemption.id}`,
          `Cross-tenant credit receivable for reward ${reward.name}`,
        ]
      );

      await client.query('COMMIT');
      return {
        ...crossRedemption,
        redemption_code: redRes.rows[0].code || redemptionCode,
        expires_at: expiresAt,
        idempotentReplay: false,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
