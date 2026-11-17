import db from '../config/db.js';
import { calculatePointsEarned } from '../helpers/points.js';
import { LedgerService } from './ledger.js';

export class LoyaltyService {
  /**
   * Fetches customer details including points balance and summary.
   */
  static async getCustomerPointsSummary(customerId: string, tenantId?: string) {
    const query = tenantId
      ? `SELECT id, tenant_id, phone, name, tier, points_balance, total_earned, total_redeemed, is_verified, last_visit FROM customer_summary WHERE id = $1 AND tenant_id = $2::uuid`
      : `SELECT id, tenant_id, phone, name, tier, points_balance, total_earned, total_redeemed, is_verified, last_visit FROM customer_summary WHERE id = $1`;
    const params = tenantId ? [customerId, tenantId] : [customerId];
    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Customer not found');
    }

    return result.rows[0];
  }

  /**
   * Records a purchase and awards points to a customer.
   * Utilizes database transaction for consistency.
   */
  static async earnPoints(
    tenantId: string,
    customerId: string,
    branchId: string,
    invoiceId: string,
    amount: number,
    notes?: string
  ) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch tenant loyalty settings & customer tier multiplier
      const tenantRes = await client.query(
        'SELECT points_per_egp, min_purchase_egp FROM tenants WHERE id = $1',
        [tenantId]
      );
      if (tenantRes.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      const { points_per_egp, min_purchase_egp } = tenantRes.rows[0];

      const customerRes = await client.query(
        'SELECT tier FROM customers WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
        [customerId, tenantId]
      );
      if (customerRes.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const tier = customerRes.rows[0].tier;

      // Look up tier multiplier from tier_benefits table (tenant-specific or system default)
      const tbRes = await client.query(
        `SELECT multiplier FROM tier_benefits
         WHERE (tenant_id = $1 OR tenant_id IS NULL)
         AND tier_name = $2
         ORDER BY tenant_id NULLS LAST
         LIMIT 1`,
        [tenantId, tier]
      );
      let multiplier = 1.0;
      if (tbRes.rows.length > 0) {
        multiplier = Number(tbRes.rows[0].multiplier);
      }

      // Calculate final points
      const pointsEarned = calculatePointsEarned(amount, Number(points_per_egp), multiplier, Number(min_purchase_egp));

      // 2. Record transaction (with ON CONFLICT DO NOTHING to ensure idempotency)
      const txRes = await client.query(
        `INSERT INTO transactions (tenant_id, customer_id, branch_id, invoice_id, amount, points_earned)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, invoice_id) DO NOTHING
         RETURNING id`,
        [tenantId, customerId, branchId, invoiceId, amount, pointsEarned]
      );

      // If transaction already existed, idempotently return existing summary
      if (txRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return await this.getCustomerPointsSummary(customerId, tenantId);
      }

      const transactionId = txRes.rows[0].id;

      // 3. Record positive points in Wallet Ledger (idempotent per invoice)
      if (pointsEarned > 0) {
        await LedgerService.insert(client, {
          tenantId,
          customerId,
          type: 'earned',
          points: pointsEarned,
          referenceId: transactionId,
          referenceType: 'transaction',
          note: notes || `Earned from invoice ${invoiceId}`,
          idempotencyKey: `earn:${tenantId}:${invoiceId}`,
        });
      }

      // 4. Update customer last_visit timestamp
      await client.query(
        'UPDATE customers SET last_visit = NOW() WHERE id = $1 AND tenant_id = $2',
        [customerId, tenantId]
      );

      await client.query('COMMIT');
      return await this.getCustomerPointsSummary(customerId, tenantId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generates a redemption code and deducts points for a reward
   * with OTP verification guard and atomic max_redemptions protection.
   */
  static async redeemReward(
    tenantId: string,
    customerId: string,
    rewardId: string,
    branchId?: string
  ) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock customer row, verify OTP verification status, and fetch current balance
      const balanceRes = await client.query(
        `SELECT c.id, c.tier, c.is_verified, COALESCE(cb.current_balance, 0) AS points_balance
         FROM customers c
         LEFT JOIN customer_balances cb ON c.id = cb.customer_id AND cb.tenant_id = c.tenant_id
         WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL
         FOR UPDATE OF c`,
        [customerId, tenantId]
      );
      if (balanceRes.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = balanceRes.rows[0];

      if (!customer.is_verified) {
        throw new Error('Customer phone must be verified via OTP before redeeming rewards');
      }

      // 2. Atomic reward reservation (prevents concurrent over-redemption past max_redemptions)
      const rewardUpdateRes = await client.query(
        `UPDATE rewards
         SET current_redemptions = COALESCE(current_redemptions, 0) + 1,
             updated_at = NOW()
         WHERE id = $1
           AND tenant_id = $2
           AND deleted_at IS NULL
           AND is_active = true
           AND (max_redemptions IS NULL OR COALESCE(current_redemptions, 0) < max_redemptions)
         RETURNING id, name, required_points, code_validity_hours, min_tier`,
        [rewardId, tenantId]
      );
      if (rewardUpdateRes.rows.length === 0) {
        throw new Error('Reward is inactive or redemption limit has been reached');
      }

      const reward = rewardUpdateRes.rows[0];
      const pointsRequired = Number(reward.required_points);
      const balance = Number(customer.points_balance);

      if (balance < pointsRequired) {
        throw new Error(`Insufficient points balance. Required: ${pointsRequired}, Available: ${balance}`);
      }

      // Check tier permission if needed
      if (reward.min_tier && customer.tier) {
        const tierHierarchy: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
        if ((tierHierarchy[customer.tier] ?? 0) < (tierHierarchy[reward.min_tier] ?? 0)) {
          throw new Error(`Reward is restricted to ${reward.min_tier} tier and above`);
        }
      }

      // 3. Generate unique redemption code (calling Postgres function)
      const codeRes = await client.query('SELECT generate_redemption_code() as code');
      const redemptionCode = codeRes.rows[0].code;

      const validityHours = Number(reward.code_validity_hours ?? 24);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + validityHours);

      // 4. Create Redemption Record
      const redemptionRes = await client.query(
        `INSERT INTO redemptions (tenant_id, customer_id, reward_id, branch_id, code, points_used, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, code`,
        [tenantId, customerId, rewardId, branchId || null, redemptionCode, pointsRequired, expiresAt]
      );

      const redemptionId = redemptionRes.rows[0].id;
      const finalCode = redemptionRes.rows[0].code || redemptionCode;

      // 5. Deduct points via Wallet Ledger (idempotent per redemption)
      await LedgerService.insert(client, {
        tenantId,
        customerId,
        type: 'redeemed',
        points: pointsRequired,
        referenceId: redemptionId,
        referenceType: 'redemption',
        note: `Redeemed reward: ${reward.name || rewardId}`,
        idempotencyKey: `redeem:${redemptionId}`,
      });

      await client.query('COMMIT');
      return {
        success: true,
        redemptionId,
        code: finalCode,
        redemptionCode: finalCode,
        expiresAt,
        pointsSpent: pointsRequired,
        remainingBalance: balance - pointsRequired,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Claws back points for a refunded transaction using 'reversal' debit type.
   */
  static async refundPoints(tenantId: string, invoiceId: string, notes?: string) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const txRes = await client.query(
        'SELECT id, customer_id, points_earned FROM transactions WHERE tenant_id = $1 AND invoice_id = $2',
        [tenantId, invoiceId]
      );

      if (txRes.rows.length === 0) {
        throw new Error('Original transaction for refund not found');
      }

      const { id: transactionId, customer_id: customerId, points_earned: pointsEarned } = txRes.rows[0];

      // Check if already refunded/reversed
      const existingReversal = await client.query(
        `SELECT id FROM wallet_ledger
         WHERE tenant_id = $1 AND customer_id = $2 AND reference_id = $3 AND type = 'reversal'`,
        [tenantId, customerId, transactionId]
      );

      if (existingReversal.rows.length > 0) {
        throw new Error('Transaction has already been refunded');
      }

      if (Number(pointsEarned) > 0) {
        await LedgerService.insert(client, {
          tenantId,
          customerId,
          type: 'reversal',
          points: Number(pointsEarned),
          referenceId: transactionId,
          referenceType: 'transaction',
          note: notes || `Refund reversal for invoice ${invoiceId}`,
          idempotencyKey: `reversal:${tenantId}:${invoiceId}`,
        });
      }

      await client.query('COMMIT');
      return await this.getCustomerPointsSummary(customerId, tenantId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Manual points adjustment by an admin: positive points become an
   * 'adjustment' credit, negative points a 'reversal' debit. Reversals are
   * refused if they would take the customer's balance below zero.
   */
  static async adjustPoints(tenantId: string, customerId: string, points: number, note?: string) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const balanceRes = await client.query(
        `SELECT COALESCE(cb.current_balance, 0) AS balance
         FROM customers c
         LEFT JOIN customer_balances cb ON c.id = cb.customer_id
         WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL
         FOR UPDATE`,
        [customerId, tenantId]
      );
      if (balanceRes.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const balance = Number(balanceRes.rows[0].balance);
      if (points < 0 && balance + points < 0) {
        throw new Error(`Cannot reverse ${Math.abs(points)} points; available balance is ${balance}`);
      }

      await LedgerService.insert(client, {
        tenantId,
        customerId,
        type: points > 0 ? 'adjustment' : 'reversal',
        points: Math.abs(points),
        referenceType: 'adjustment',
        note: note || 'Manual points adjustment',
      });

      await client.query('COMMIT');
      return { success: true, newBalance: balance + points };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
