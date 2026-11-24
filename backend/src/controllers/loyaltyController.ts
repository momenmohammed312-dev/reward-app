import { Response } from 'express';
import db from '../config/db.js';
import { LoyaltyService } from '../services/loyalty.js';
import { LedgerService } from '../services/ledger.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { logger } from '../services/logger.js';
import { normalizePhone } from '../helpers/phone.js';

async function logAdminAction(tenantId: string, adminUserId: string | undefined, actionType: string, targetType: string, targetId: string | undefined, newValue?: any) {
  try {
    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id, new_value)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb)`,
      [tenantId, adminUserId || null, actionType, targetType, targetId || null, newValue ? JSON.stringify(newValue) : null]
    );
  } catch (err) {
    logger.error('Audit log error', { error: (err as Error).message });
  }
}

export class LoyaltyController {
  /**
   * Retrieves profile & point balance for the authenticated customer.
   */
  static async getCustomerProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const customerId = req.user?.id;
      if (!customerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const summary = await LoyaltyService.getCustomerPointsSummary(customerId);
      res.json(summary);
    } catch (error: any) {
      res.status(404).json({ error: 'Not Found', message: error.message });
    }
  }

  /**
   * Updates the authenticated customer's profile (name).
   * PATCH /api/loyalty/profile
   */
  static async updateCustomerProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const customerId = req.user?.id;
      const tenantId = req.user?.tenant_id;
      const { name } = req.body;

      if (!customerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Validation Error', message: 'Name is required' });
      }

      const result = await db.query(
        `UPDATE customers SET name = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING id, phone, name`,
        [name.trim(), customerId, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Customer not found' });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      logger.error('Update profile error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }

  /**
   * Retrieves points ledger history for the authenticated customer.
   */
  static async getLedgerHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const customerId = req.user?.id;
      const tenantId = req.user?.tenant_id;

      if (!customerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const countRes = await db.query(
        `SELECT COUNT(*)::int AS total
         FROM wallet_ledger
         WHERE tenant_id = $1::uuid AND customer_id = $2`,
        [tenantId, customerId]
      );
      const total = countRes.rows[0].total;

      const result = await db.query(
        `SELECT type, points, reference_type, note, created_at
         FROM wallet_ledger
         WHERE tenant_id = $1::uuid AND customer_id = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [tenantId, customerId, limit, offset]
      );

      res.json({ rows: result.rows, total, page, limit });
    } catch (error) {
      logger.error('Ledger history error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Allows admins/cashiers to manually award bonus points to a customer via LedgerService.insert.
   */
  static async adminEarnPointsManual(req: AuthenticatedRequest, res: Response) {
    const tenantId = req.user?.tenant_id;
    const adminUserId = req.user?.id;
    const { customer_id, customer_phone, points, amount, reason, note, branch_id } = req.body;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2.6 Branch-level authorization: cashier cannot grant points across different branches
    if (req.user?.role === 'cashier' && req.user?.branch_id && branch_id && req.user.branch_id !== branch_id) {
      return res.status(403).json({ error: 'Cashier cannot perform actions for a different branch' });
    }

    const pointsToAdd = points ?? amount;
    if ((!customer_id && !customer_phone) || typeof pointsToAdd !== 'number' || pointsToAdd <= 0) {
      return res.status(400).json({ error: 'Missing fields', message: 'customer_id (or customer_phone) and positive points/amount are required' });
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      let resolvedCustomerId = customer_id;

      if (!resolvedCustomerId && customer_phone) {
        const normalizedPhone = normalizePhone(String(customer_phone));
        if (!normalizedPhone) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Invalid phone', message: 'Invalid Egyptian phone number' });
        }
        const custRes = await client.query(
          'SELECT id FROM customers WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL',
          [tenantId, normalizedPhone]
        );
        if (custRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Not Found', message: 'Customer not found with that phone' });
        }
        resolvedCustomerId = custRes.rows[0].id;
      }

      if (!resolvedCustomerId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Missing fields', message: 'customer_id (or customer_phone) is required' });
      }

      // Verify customer ownership within tenant
      const customerCheck = await client.query(
        `SELECT id FROM customers WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL`,
        [resolvedCustomerId, tenantId]
      );
      if (customerCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Customer not found' });
      }

      const noteText = reason ?? note ?? 'Manual points granted by admin';

      // Route write strictly through LedgerService.insert()
      const ledgerEntry = await LedgerService.insert(client, {
        tenantId,
        customerId: resolvedCustomerId,
        type: 'bonus',
        points: pointsToAdd,
        note: noteText,
        createdBy: adminUserId || req.user?.email || 'admin',
        idempotencyKey: `manual:${tenantId}:${resolvedCustomerId}:${Date.now()}`,
      });

      await client.query('COMMIT');

      const ledgerId =
        ledgerEntry?.rows?.[0]?.id ??
        (ledgerEntry as unknown as { id?: string } | undefined)?.id;

      await logAdminAction(tenantId, adminUserId, 'manual_points_grant', 'customer', resolvedCustomerId, {
        points: pointsToAdd,
        reason: noteText,
        ledgerId,
      });

      const updatedSummary = await LoyaltyService.getCustomerPointsSummary(resolvedCustomerId, tenantId);
      return res.json({
        success: true,
        message: 'Points awarded successfully',
        pointsAdded: pointsToAdd,
        summary: updatedSummary,
      });
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Admin earn error', { error: msg });
      return res.status(500).json({ error: 'Internal Server Error', message: msg });
    } finally {
      client.release();
    }
  }

  /**
   * Allows admins to refund a transaction and claw back the awarded points.
   */
  static async adminRefundTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      const { invoice_id } = req.body;

      const result = await LoyaltyService.refundPoints(tenantId!, invoice_id);
      res.json(result);
    } catch (error: any) {
      logger.error('Admin refund error', { error: (error as Error).message });
      res.status(400).json({ error: 'Refund Failed', message: error.message });
    }
  }

  /**
   * Allows admins to apply a signed points adjustment (credit or reversal).
   */
  static async adminAdjustPoints(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      const { customer_id, customer_phone, points, note } = req.body;

      let resolvedCustomerId = customer_id;

      if (!resolvedCustomerId && customer_phone) {
        const custRes = await db.query(
          'SELECT id FROM customers WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL',
          [tenantId, customer_phone]
        );
        if (custRes.rows.length === 0) {
          return res.status(404).json({ error: 'Not Found', message: 'Customer not found with that phone' });
        }
        resolvedCustomerId = custRes.rows[0].id;
      }

      if (!resolvedCustomerId) {
        return res.status(400).json({ error: 'Missing fields', message: 'customer_id (or customer_phone) is required' });
      }

      const customerCheck = await db.query(
        `SELECT id FROM customers WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL`,
        [resolvedCustomerId, tenantId]
      );
      if (customerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Customer not found for this tenant' });
      }

      const result = await LoyaltyService.adjustPoints(tenantId!, resolvedCustomerId, points, note);
      await logAdminAction(tenantId!, req.user?.id, 'adjust_points', 'customer', resolvedCustomerId, { points, note });
      res.json({ message: 'Points adjusted successfully', ...result });
    } catch (error: any) {
      logger.error('Admin adjust error', { error: (error as Error).message });
      res.status(400).json({ error: 'Adjustment Failed', message: error.message });
    }
  }

  /**
   * Customer initiates a reward redemption from their mobile PWA.
   */
  static async customerRedeemReward(req: AuthenticatedRequest, res: Response) {
    try {
      const customerId = req.user?.id;
      const tenantId = req.user?.tenant_id;
      const { reward_id } = req.body;

      if (!reward_id) {
        return res.status(400).json({ error: 'Missing fields', message: 'reward_id is required' });
      }

      const result = await LoyaltyService.redeemReward(tenantId!, customerId!, reward_id);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: 'Redemption Failed', message: error.message });
    }
  }

  /**
   * Cashier processes/validates a redemption code at checkout (transactional FOR UPDATE + branch check).
   */
  static async cashierProcessRedemption(req: AuthenticatedRequest, res: Response) {
    const tenantId = req.user?.tenant_id;
    const rawCode = req.body?.code || req.body?.redemption_code;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!rawCode) {
      return res.status(400).json({ error: 'Missing fields', message: 'code is required' });
    }

    const normalizedCode = String(rawCode).trim().toUpperCase();
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `SELECT r.*, rw.name as reward_name, rw.reward_type, rw.discount_value, c.name as customer_name, c.phone as customer_phone
         FROM redemptions r
         JOIN rewards rw ON r.reward_id = rw.id
         JOIN customers c ON r.customer_id = c.id
         WHERE r.code = $1 AND r.tenant_id = $2::uuid
         FOR UPDATE OF r`,
        [normalizedCode, tenantId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Not Found', message: 'Invalid redemption code' });
      }

      const redemption = result.rows[0];

      if (redemption.used_at) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Redemption Failed', message: `Code has already been used on ${redemption.used_at}` });
      }

      if (redemption.expires_at && new Date() > new Date(redemption.expires_at)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Redemption Failed', message: 'Redemption code has expired' });
      }

      const cashierBranchId = req.user?.branch_id;
      if (req.user?.role === 'cashier' && cashierBranchId && redemption.branch_id && redemption.branch_id !== cashierBranchId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Cashier is unauthorized to process redemptions for a different branch' });
      }

      await client.query(
        `UPDATE redemptions
         SET used_at = NOW(), branch_id = COALESCE($1::uuid, branch_id)
         WHERE id = $2`,
        [cashierBranchId || null, redemption.id]
      );

      await client.query('COMMIT');

      return res.json({
        success: true,
        message: 'Redemption processed successfully',
        rewardTitle: redemption.reward_name,
        customerName: redemption.customer_name,
        customerPhone: redemption.customer_phone,
        reward: {
          name: redemption.reward_name,
          type: redemption.reward_type,
          discount_value: redemption.discount_value,
        },
        customer: {
          name: redemption.customer_name,
          phone: redemption.customer_phone,
        },
      });
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Process redemption error', { error: msg });
      return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      client.release();
    }
  }

  /**
   * Alias for cashierProcessRedemption supporting legacy/Phase 2 handler naming.
   */
  static async processRedemptionCode(req: AuthenticatedRequest, res: Response) {
    return LoyaltyController.cashierProcessRedemption(req, res);
  }
}
