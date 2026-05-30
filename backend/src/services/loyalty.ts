import db from '../config/db.js';

export class LoyaltyService {
  /**
   * Fetches customer details including points balance and summary.
   */
  static async getCustomerPointsSummary(customerId: string) {
    const result = await db.query(
      `SELECT * FROM customer_summary WHERE id = $1`,
      [customerId]
    );

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

      if (amount < Number(min_purchase_egp)) {
        throw new Error(`Amount is less than minimum purchase threshold (${min_purchase_egp} EGP)`);
      }

      const customerRes = await client.query(
        'SELECT tier FROM customers WHERE id = $1',
        [customerId]
      );
      if (customerRes.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const tier = customerRes.rows[0].tier;

      // Tier multipliers (Bronze: 1x, Silver: 1.5x, Gold: 2x, Platinum: 3x)
      let multiplier = 1.0;
      if (tier === 'silver') multiplier = 1.5;
      else if (tier === 'gold') multiplier = 2.0;
      else if (tier === 'platinum') multiplier = 3.0;

      // Calculate final points
      const pointsEarned = Math.floor(amount * Number(points_per_egp) * multiplier);

      // 2. Record transaction (with ON CONFLICT DO NOTHING to ensure idempotency)
      const txRes = await client.query(
        `INSERT INTO transactions (tenant_id, customer_id, branch_id, invoice_id, amount, points_earned)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, invoice_id) DO NOTHING
         RETURNING id`,
        [tenantId, customerId, branchId, invoiceId, amount, pointsEarned]
      );

      // If the transaction already exists, skip ledger insertion to prevent duplicate points
      if (txRes.rows.length > 0) {
        const transactionId = txRes.rows[0].id;

        // 3. Record in Wallet Ledger
        await client.query(
          `INSERT INTO wallet_ledger (tenant_id, customer_id, type, points, reference_id, reference_type, note)
           VALUES ($1, $2, 'earned', $3, $4, 'transaction', $5)`,
          [tenantId, customerId, pointsEarned, transactionId, notes || 'Earned from purchase']
        );
      }

      await client.query('COMMIT');
      return { success: true, pointsEarned };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generates a redemption code and deducts points for a reward.
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

      // 1. Fetch current balance
      const balanceRes = await client.query(
        `SELECT points_balance FROM customer_summary WHERE id = $1`,
        [customerId]
      );
      if (balanceRes.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const balance = balanceRes.rows[0].points_balance;

      // 2. Fetch reward details
      const rewardRes = await client.query(
        `SELECT required_points, code_validity_hours, min_tier, is_active FROM rewards WHERE id = $1 AND tenant_id = $2`,
        [rewardId, tenantId]
      );
      if (rewardRes.rows.length === 0) {
        throw new Error('Reward not found');
      }

      const { required_points, code_validity_hours, min_tier, is_active } = rewardRes.rows[0];

      if (!is_active) {
        throw new Error('Reward is currently inactive');
      }

      if (balance < required_points) {
        throw new Error(`Insufficient points balance. Required: ${required_points}, Available: ${balance}`);
      }

      // Check tier permission if needed
      // (Simplified: assuming tier ranking order bronze < silver < gold < platinum)
      if (min_tier) {
        const customerRes = await client.query('SELECT tier FROM customers WHERE id = $1', [customerId]);
        const currentTier = customerRes.rows[0].tier;
        const tierHierarchy: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };

        if (tierHierarchy[currentTier] < tierHierarchy[min_tier]) {
          throw new Error(`Reward is restricted to ${min_tier} tier and above`);
        }
      }

      // 3. Generate unique redemption code (calling Postgres function)
      const codeRes = await client.query('SELECT generate_redemption_code() as code');
      const redemptionCode = codeRes.rows[0].code;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + code_validity_hours);

      // 4. Create Redemption Record
      const redemptionRes = await client.query(
        `INSERT INTO redemptions (tenant_id, customer_id, reward_id, branch_id, code, points_used, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [tenantId, customerId, rewardId, branchId || null, redemptionCode, required_points, expiresAt]
      );

      const redemptionId = redemptionRes.rows[0].id;

      // 5. Deduct points via Wallet Ledger
      await client.query(
        `INSERT INTO wallet_ledger (tenant_id, customer_id, type, points, reference_id, reference_type, note)
         VALUES ($1, $2, 'redeemed', $3, $4, 'redemption', $5)`,
        [tenantId, customerId, required_points, redemptionId, `Redeemed reward: ${rewardId}`]
      );

      await client.query('COMMIT');
      return { success: true, code: redemptionCode, expiresAt };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handles refunding a transaction and clawing back loyalty points.
   */
  static async refundPoints(tenantId: string, invoiceId: string) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // Find original transaction
      const txRes = await client.query(
        'SELECT id, customer_id, points_earned FROM transactions WHERE tenant_id = $1 AND invoice_id = $2',
        [tenantId, invoiceId]
      );

      if (txRes.rows.length === 0) {
        throw new Error('Original transaction not found');
      }

      const { id, customer_id, points_earned } = txRes.rows[0];

      // Check if already refunded
      const refundCheck = await client.query(
        `SELECT id FROM wallet_ledger
         WHERE tenant_id = $1 AND customer_id = $2 AND type = 'refund' AND reference_id = $3`,
        [tenantId, customer_id, id]
      );

      if (refundCheck.rows.length > 0) {
        throw new Error('Transaction has already been refunded');
      }

      // Record refund in ledger
      await client.query(
        `INSERT INTO wallet_ledger (tenant_id, customer_id, type, points, reference_id, reference_type, note)
         VALUES ($1, $2, 'refund', $3, $4, 'transaction', $5)`,
        [tenantId, customer_id, points_earned, id, `Refund for invoice: ${invoiceId}`]
      );

      await client.query('COMMIT');
      return { success: true, pointsRefunded: points_earned };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
