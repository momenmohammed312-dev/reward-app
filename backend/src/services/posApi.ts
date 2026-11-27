import db from '../config/db.js';
import { normalizePhone } from '../helpers/phone.js';
import { RawOrderItem } from '../helpers/rulesEngine.js';
import { LoyaltyService, RefundItemInput } from './loyalty.js';

export class PosApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'PosApiError';
  }
}

export class PosApiService {
  /**
   * Synchronous customer balance, card, tier & reward eligibility lookup for POS terminals.
   */
  static async getCustomer(tenantId: string, identifier: string) {
    const customer = await LoyaltyService.lookupCustomerByIdentifier(tenantId, identifier);
    if (!customer) {
      throw new PosApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found for this store');
    }

    const balance = Number(customer.points_balance || 0);
    const rewardsRes = await db.query(
      `SELECT id, name AS title, required_points, reward_type,
              discount_value::float8 AS discount_value,
              min_order_egp::float8 AS min_order_egp
       FROM rewards
       WHERE tenant_id = $1::uuid AND is_active = true AND deleted_at IS NULL
         AND (max_redemptions IS NULL OR COALESCE(current_redemptions, 0) < max_redemptions)
       ORDER BY required_points ASC`,
      [tenantId]
    );

    return {
      customer: {
        id: customer.id,
        card_number: customer.card_number,
        phone: customer.phone,
        name: customer.name,
        tier: customer.tier,
        points_balance: balance,
        wallet_value_egp: Number(customer.wallet_value_egp || 0),
        total_spent_egp: Number(customer.total_spent_egp || 0),
        is_verified: Boolean(customer.is_verified),
      },
      rewards: (rewardsRes.rows || []).map((r: any) => ({
        ...r,
        eligible: Boolean(customer.is_verified) && balance >= Number(r.required_points),
      })),
    };
  }

  /**
   * Synchronous earn endpoint for live POS checkout (returns updated points immediately).
   */
  static async earn(
    tenantId: string,
    branchId: string,
    payload: {
      customer_identifier?: string;
      customer_phone?: string;
      card_number?: string;
      customer_name?: string;
      invoice_id: string;
      total_amount: number;
      discount_amount?: number;
      items?: RawOrderItem[];
      note?: string;
    }
  ) {
    const rawIdentifier = String(
      payload.customer_identifier || payload.card_number || payload.customer_phone || ''
    ).trim();

    let customerId: string | null = null;
    const byCard = await db.query(
      'SELECT id FROM customers WHERE tenant_id = $1::uuid AND UPPER(card_number) = $2 AND deleted_at IS NULL LIMIT 1',
      [tenantId, rawIdentifier.toUpperCase()]
    );

    if (byCard.rows.length > 0) {
      customerId = byCard.rows[0].id;
    } else {
      const normalizedPhone = normalizePhone(rawIdentifier);
      if (!normalizedPhone) {
        throw new PosApiError(400, 'INVALID_CUSTOMER', 'Valid Egyptian phone number or known card_number is required');
      }

      const custRes = await db.query(
        `INSERT INTO customers (tenant_id, phone, name, is_verified, pos_identified_at)
         VALUES ($1::uuid, $2, $3, false, NOW())
         ON CONFLICT (tenant_id, phone) DO UPDATE SET
           name = COALESCE(NULLIF(customers.name, 'POS Customer'), EXCLUDED.name, customers.name),
           pos_identified_at = NOW(),
           deleted_at = NULL,
           updated_at = NOW()
         RETURNING id`,
        [tenantId, normalizedPhone, payload.customer_name?.trim() || 'POS Customer']
      );
      customerId = custRes.rows[0].id;
    }

    const summary = await LoyaltyService.earnPoints(
      tenantId,
      customerId!,
      branchId,
      payload.invoice_id,
      Number(payload.total_amount),
      payload.note || `POS Sync Order #${payload.invoice_id}`,
      {
        items: payload.items,
        discountAmount: payload.discount_amount,
        posPayload: payload as unknown as Record<string, unknown>,
      }
    );

    return {
      status: (summary as any).duplicate ? 'duplicate' : 'ok',
      invoice_id: payload.invoice_id,
      points_earned: Number((summary as any).points_earned || 0),
      below_minimum: Boolean((summary as any).below_minimum),
      points_balance: Number(summary.points_balance || 0),
      wallet_value_egp: Number(summary.wallet_value_egp || 0),
      tier: summary.tier,
      card_number: summary.card_number,
    };
  }

  /**
   * Synchronous checkout redemption: either validates & consumes an existing voucher `code`,
   * or atomically issues and immediately settles a reward for `(customer_identifier, reward_id)`.
   */
  static async redeem(
    tenantId: string,
    branchId: string,
    payload: {
      code?: string;
      customer_identifier?: string;
      reward_id?: string;
      idempotency_key?: string;
    }
  ) {
    if (payload.code) {
      const normalizedCode = payload.code.trim().toUpperCase();
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        const res = await client.query(
          `SELECT r.*, rw.name AS reward_name, rw.reward_type, rw.discount_value::float8 AS discount_value,
                  rw.min_order_egp::float8 AS min_order_egp, c.name AS customer_name, c.phone AS customer_phone,
                  c.card_number
           FROM redemptions r
           JOIN rewards rw ON r.reward_id = rw.id
           JOIN customers c ON r.customer_id = c.id
           WHERE r.code = $1 AND r.tenant_id = $2::uuid
           FOR UPDATE OF r`,
          [normalizedCode, tenantId]
        );
        if (res.rows.length === 0) {
          throw new PosApiError(404, 'REDEMPTION_NOT_FOUND', 'Invalid redemption code');
        }
        const rd = res.rows[0];
        if (rd.used_at) {
          throw new PosApiError(400, 'ALREADY_USED', 'Redemption code has already been used');
        }
        if (rd.expires_at && new Date() > new Date(rd.expires_at)) {
          throw new PosApiError(400, 'CODE_EXPIRED', 'Redemption code has expired');
        }
        if (rd.branch_id && rd.branch_id !== branchId) {
          throw new PosApiError(403, 'BRANCH_MISMATCH', 'Voucher belongs to a different branch');
        }

        await client.query(
          'UPDATE redemptions SET used_at = NOW(), branch_id = COALESCE($1::uuid, branch_id) WHERE id = $2::uuid',
          [branchId, rd.id]
        );
        await client.query('COMMIT');

        return {
          status: 'redeemed',
          code: normalizedCode,
          points_spent: Number(rd.points_used),
          reward: {
            name: rd.reward_name,
            type: rd.reward_type,
            discount_value: rd.discount_value,
            min_order_egp: rd.min_order_egp,
          },
          customer: {
            name: rd.customer_name,
            phone: rd.customer_phone,
            card_number: rd.card_number,
          },
        };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const customer = await LoyaltyService.lookupCustomerByIdentifier(tenantId, payload.customer_identifier!);
    if (!customer) {
      throw new PosApiError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
    }

    const redemption = await LoyaltyService.redeemReward(tenantId, customer.id, payload.reward_id!, branchId, {
      markUsedImmediately: true,
      idempotencyKey: payload.idempotency_key ? `pos_redeem:${tenantId}:${payload.idempotency_key}` : undefined,
    });

    const rwRes = await db.query(
      `SELECT name, reward_type, discount_value::float8 AS discount_value, min_order_egp::float8 AS min_order_egp
       FROM rewards WHERE id = $1::uuid AND tenant_id = $2::uuid`,
      [payload.reward_id!, tenantId]
    );
    const rw = rwRes.rows[0] || {};

    return {
      status: 'redeemed',
      redemption_id: redemption.redemptionId,
      code: redemption.code,
      points_spent: redemption.pointsSpent,
      remaining_balance: redemption.remainingBalance,
      reward: {
        name: rw.name,
        type: rw.reward_type,
        discount_value: rw.discount_value,
        min_order_egp: rw.min_order_egp,
      },
    };
  }

  /**
   * Synchronous refund clawback for POS terminals (full, amount-partial, or itemized).
   */
  static async refund(
    tenantId: string,
    payload: {
      invoice_id: string;
      partial_amount?: number;
      items?: RefundItemInput[];
      note?: string;
    }
  ) {
    return LoyaltyService.refundPoints(
      tenantId,
      payload.invoice_id,
      payload.note,
      payload.partial_amount,
      payload.items
    );
  }
}
