import { Response } from 'express';
import crypto from 'crypto';
import db from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { logger } from '../services/logger.js';
import { AnalyticsService, AnalyticsError } from '../services/analytics.js';
import { AdminOpsService, AdminOpsError } from '../services/adminOps.js';

async function logAdminAction(tenantId: string, adminUserId: string | undefined, actionType: string, targetType: string, targetId: string | undefined, oldValue?: any, newValue?: any) {
  try {
    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id, old_value, new_value)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, $7::jsonb)`,
      [tenantId, adminUserId || null, actionType, targetType, targetId || null, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null]
    );
  } catch (err) {
    logger.error('Audit log error', { error: (err as Error).message });
  }
}

export class AdminController {

  // GET /api/admin/stats?branch_id=
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const branchId = (req.query.branch_id as string | undefined) || undefined;
      const stats = await AdminOpsService.getFinancialStats(tenantId, branchId);
      return res.json(stats);
    } catch (err: any) {
      if (err instanceof AnalyticsError && err.code === 'BRANCH_NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Admin stats error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  // GET /api/admin/customers?name=&phone=&tier=&inactive_days=&page=&limit=
  static async getCustomers(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const name = req.query.name as string | undefined;
      const phone = req.query.phone as string | undefined;
      const tier = req.query.tier as string | undefined;
      const inactiveDays = req.query.inactive_days ? parseInt(req.query.inactive_days as string, 10) : undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

      const data = await AdminOpsService.getCustomersFiltered(tenantId, {
        name,
        phone,
        tier,
        inactiveDays: inactiveDays && inactiveDays > 0 ? inactiveDays : undefined,
        page,
        limit,
      });
      res.json(data);
    } catch (err: any) {
      logger.error('Admin customers error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }

  // POST /api/admin/customers
  static async createCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const created = await AdminOpsService.createCustomer(
        req.user!.tenant_id,
        req.user?.id,
        req.body
      );
      return res.status(201).json(created);
    } catch (err: any) {
      if (err instanceof AdminOpsError && err.code === 'CONFLICT') {
        return res.status(409).json({ error: 'Conflict', message: err.message });
      }
      logger.error('Create customer error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  // GET /api/admin/customers/export
  static async exportCustomers(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const name = req.query.name as string | undefined;
      const phone = req.query.phone as string | undefined;
      const tier = req.query.tier as string | undefined;
      const inactiveDays = req.query.inactive_days ? parseInt(req.query.inactive_days as string, 10) : undefined;

      const csv = await AdminOpsService.exportCustomersCsv(tenantId, {
        name,
        phone,
        tier,
        inactiveDays: inactiveDays && inactiveDays > 0 ? inactiveDays : undefined,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
      return res.send(csv);
    } catch (err: any) {
      logger.error('Export customers error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to export customers' });
    }
  }

  // GET /api/admin/customers/:id/ledger
  static async getCustomerLedger(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await AdminOpsService.getCustomerLedger(req.user!.tenant_id, req.params.id);
      return res.json(data);
    } catch (err: any) {
      if (err instanceof AdminOpsError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Customer ledger error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch customer ledger' });
    }
  }

  // GET /api/admin/rewards
  static async getRewards(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const result = await db.query(`
        SELECT id,
               name AS title,
               reward_type,
               required_points AS "pointsRequired",
               discount_value AS "discountValue",
               max_redemptions AS "maxRedemptions",
               min_order_egp AS "minOrderEgp",
               description,
               category,
               image_url AS "imageUrl",
               terms,
               expiry_days AS "expiryDays",
               is_active,
               created_at
        FROM rewards
        WHERE tenant_id = $1::uuid AND deleted_at IS NULL
        ORDER BY created_at DESC
      `, [tenantId]);
      res.json(result.rows);
    } catch (err: any) {
      logger.error('Admin rewards error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch rewards' });
    }
  }

  // POST /api/admin/rewards
  static async createReward(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { title, description, points_required, category, expiry_days, reward_type, discount_value, min_order_egp, max_redemptions } = req.body;
      
      if (!title || !points_required) {
        return res.status(400).json({ error: 'title and points_required are required' });
      }

      const result = await db.query(`
        INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, expiry_days, discount_value, min_order_egp, max_redemptions)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [tenantId, title, reward_type || 'free_item', points_required, description || null, category || 'عام', expiry_days || 30, discount_value || null, min_order_egp || null, max_redemptions || null]);

      await logAdminAction(tenantId, req.user?.id, 'create_reward', 'reward', result.rows[0]?.id, undefined, { title: req.body.title, points_required: req.body.points_required, reward_type: reward_type || 'free_item' });
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      logger.error('Create reward error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to create reward' });
    }
  }

  // GET /api/admin/branches
  static async getBranches(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const result = await db.query(`
        SELECT id, name, city, pos_type, is_active, created_at
        FROM branches
        WHERE tenant_id = $1::uuid AND deleted_at IS NULL
        ORDER BY created_at DESC
      `, [tenantId]);
      res.json(result.rows);
    } catch (err: any) {
      logger.error('Admin branches error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch branches' });
    }
  }

  // PATCH /api/admin/customers/:id
  static async updateCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;
      const { name, phone, tier, is_verified } = req.body;
      const adminId = req.user?.id;

      let sets = 'SET ';
      const setClauses: string[] = [];
      const setParams: any[] = [];
      let setIdx = 2;

      if (name !== undefined) { setClauses.push(`name = $${setIdx}`); setParams.push(name); setIdx++; }
      if (phone !== undefined) { setClauses.push(`phone = $${setIdx}`); setParams.push(phone); setIdx++; }
      if (tier !== undefined) { setClauses.push(`tier = $${setIdx}::tier_type`); setParams.push(tier); setIdx++; }
      if (is_verified !== undefined) { setClauses.push(`is_verified = $${setIdx}`); setParams.push(is_verified); setIdx++; }

      if (setClauses.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      sets += setClauses.join(', ');

      const result = await db.query(`
        UPDATE customers
        ${sets}
        WHERE id = $1::uuid AND tenant_id = $${setIdx}::uuid AND deleted_at IS NULL
        RETURNING id, phone, name, tier, is_verified, last_visit, created_at
      `, [id, ...setParams, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      await logAdminAction(tenantId, req.user?.id, 'update_customer', 'customer', id, undefined, { name, phone, tier, is_verified });
      res.json(result.rows[0]);
    } catch (err: any) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Conflict', message: 'A customer with this phone already exists' });
      }
      logger.error('Update customer error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  // DELETE /api/admin/customers/:id (soft delete)
  static async deleteCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;

      const result = await db.query(`
        UPDATE customers SET deleted_at = NOW()
        WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
        RETURNING id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      await logAdminAction(tenantId, req.user?.id, 'delete_customer', 'customer', id);
      res.json({ message: 'Customer deleted', id });
    } catch (err: any) {
      logger.error('Delete customer error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to delete customer' });
    }
  }

  // PATCH /api/admin/rewards/:id
  static async updateReward(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;
      const { title, description, points_required, category, expiry_days, is_active, reward_type, discount_value, min_order_egp, max_redemptions } = req.body;

      const result = await db.query(`
        UPDATE rewards
        SET name = COALESCE($3, name),
            description = COALESCE($4, description),
            required_points = COALESCE($5, required_points),
            category = COALESCE($6, category),
            expiry_days = COALESCE($7, expiry_days),
            is_active = COALESCE($8, is_active),
            reward_type = COALESCE($9::reward_type, reward_type),
            discount_value = COALESCE($10, discount_value),
            min_order_egp = COALESCE($11, min_order_egp),
            max_redemptions = COALESCE($12, max_redemptions)
        WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
        RETURNING id, name AS title, reward_type, required_points AS "pointsRequired",
                  description, category, image_url AS "imageUrl", terms,
                  expiry_days AS "expiryDays", is_active,
                  discount_value AS "discountValue", min_order_egp AS "minOrderEgp",
                  max_redemptions AS "maxRedemptions", created_at
      `, [id, tenantId, title || null, description ?? null, points_required ? Number(points_required) : null, category || null, expiry_days ? Number(expiry_days) : null, is_active ?? null, reward_type || null, discount_value ?? null, min_order_egp ?? null, max_redemptions ?? null]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Reward not found' });
      }
      await logAdminAction(tenantId, req.user?.id, 'update_reward', 'reward', id, undefined, req.body);
      res.json(result.rows[0]);
    } catch (err: any) {
      logger.error('Update reward error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to update reward' });
    }
  }

  // DELETE /api/admin/rewards/:id (soft delete)
  static async deleteReward(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;

      const result = await db.query(`
        UPDATE rewards SET deleted_at = NOW()
        WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
        RETURNING id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Reward not found' });
      }
      await logAdminAction(tenantId, req.user?.id, 'delete_reward', 'reward', id);
      res.json({ message: 'Reward deleted', id });
    } catch (err: any) {
      logger.error('Delete reward error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to delete reward' });
    }
  }

  // POST /api/admin/branches
  static async createBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { name, city, pos_type, timezone, opening_time, closing_time } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      const apiKey = `pk_${crypto.randomBytes(24).toString('hex')}`;

      const result = await db.query(`
        INSERT INTO branches (tenant_id, name, city, pos_type, api_key, timezone, opening_time, closing_time)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, city, pos_type, api_key, is_active, timezone, opening_time, closing_time, created_at
      `, [tenantId, name, city || null, pos_type || 'manual', apiKey, timezone || 'Africa/Cairo', opening_time || null, closing_time || null]);

      await logAdminAction(tenantId, req.user?.id, 'create_branch', 'branch', result.rows[0]?.id, undefined, { name, city, pos_type });
      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      logger.error('Create branch error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to create branch' });
    }
  }

  // PATCH /api/admin/branches/:id
  static async updateBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;
      const { name, city, pos_type, is_active, timezone, opening_time, closing_time } = req.body;

      const result = await db.query(`
        UPDATE branches
        SET name = COALESCE($3, name),
            city = COALESCE($4, city),
            pos_type = COALESCE($5::pos_type, pos_type),
            is_active = COALESCE($6, is_active),
            timezone = COALESCE($7, timezone),
            opening_time = COALESCE($8::time, opening_time),
            closing_time = COALESCE($9::time, closing_time)
        WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
        RETURNING id, name, city, pos_type, is_active, timezone, opening_time, closing_time, created_at
      `, [id, tenantId, name || null, city ?? null, pos_type || null, is_active ?? null, timezone || null, opening_time || null, closing_time || null]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      await logAdminAction(tenantId, req.user?.id, 'update_branch', 'branch', id, undefined, req.body);
      res.json(result.rows[0]);
    } catch (err: any) {
      logger.error('Update branch error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to update branch' });
    }
  }

  // DELETE /api/admin/branches/:id (soft delete)
  static async deleteBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;

      const result = await db.query(`
        UPDATE branches SET deleted_at = NOW()
        WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
        RETURNING id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      await logAdminAction(tenantId, req.user?.id, 'delete_branch', 'branch', id);
      res.json({ message: 'Branch deleted', id });
    } catch (err: any) {
      logger.error('Delete branch error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to delete branch' });
    }
  }

  // GET /api/admin/staff
  static async getStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const staff = await AdminOpsService.listStaff(req.user!.tenant_id);
      res.json(staff);
    } catch (err: any) {
      logger.error('Admin staff error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch staff' });
    }
  }

  // POST /api/admin/staff
  static async createStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const created = await AdminOpsService.createStaff(req.user!.tenant_id, req.user?.id, req.body);
      return res.status(201).json(created);
    } catch (err: any) {
      if (err instanceof AdminOpsError) {
        if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Not Found', message: err.message });
        if (err.code === 'CONFLICT') return res.status(409).json({ error: 'Conflict', message: err.message });
        if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden', message: err.message });
      }
      logger.error('Create staff error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to create staff member' });
    }
  }

  // PATCH /api/admin/staff/:id
  static async updateStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await AdminOpsService.updateStaff(
        req.user!.tenant_id,
        req.user?.id,
        req.params.id,
        req.body
      );
      return res.json(updated);
    } catch (err: any) {
      if (err instanceof AdminOpsError) {
        if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Not Found', message: err.message });
        if (err.code === 'FORBIDDEN') return res.status(403).json({ error: 'Forbidden', message: err.message });
      }
      logger.error('Update staff error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to update staff member' });
    }
  }

  // GET /api/admin/transactions
  static async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const branchId = (req.query.branch_id as string | undefined) || undefined;
      const search = (req.query.search as string | undefined) || undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

      const data = await AdminOpsService.getTransactions(req.user!.tenant_id, { branchId, search, page, limit });
      return res.json(data);
    } catch (err: any) {
      if (err instanceof AnalyticsError && err.code === 'BRANCH_NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Admin transactions error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }

  // GET /api/admin/redemptions
  static async getRedemptions(req: AuthenticatedRequest, res: Response) {
    try {
      const branchId = (req.query.branch_id as string | undefined) || undefined;
      const status = (req.query.status as string | undefined) || undefined;
      const search = (req.query.search as string | undefined) || undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

      const data = await AdminOpsService.getRedemptions(req.user!.tenant_id, { branchId, status, search, page, limit });
      return res.json(data);
    } catch (err: any) {
      if (err instanceof AnalyticsError && err.code === 'BRANCH_NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Admin redemptions error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch redemptions' });
    }
  }

  // GET /api/admin/audit-log
  static async getAuditLog(req: AuthenticatedRequest, res: Response) {
    try {
      const actionType = (req.query.action_type as string | undefined) || undefined;
      const userId = (req.query.user_id as string | undefined) || undefined;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));

      const data = await AdminOpsService.getAuditLog(req.user!.tenant_id, { actionType, userId, page, limit });
      return res.json(data);
    } catch (err: any) {
      logger.error('Admin audit log error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch audit log' });
    }
  }

  // GET /api/admin/pos/config
  static async getPosConfig(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await AdminOpsService.getPosConfig(req.user!.tenant_id);
      return res.json(data);
    } catch (err: any) {
      if (err instanceof AdminOpsError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Get POS config error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch POS config' });
    }
  }

  // POST /api/admin/pos/test-webhook
  static async testPosWebhook(req: AuthenticatedRequest, res: Response) {
    try {
      const { payload, customer_tier } = req.body;
      const result = await AdminOpsService.simulatePosWebhook(req.user!.tenant_id, payload, customer_tier);
      return res.json(result);
    } catch (err: any) {
      if (err instanceof AdminOpsError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Test POS webhook error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to simulate webhook' });
    }
  }

  // PATCH /api/admin/users/:id/branch
  static async assignBranchToUser(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;
      const { branch_id } = req.body;

      if (branch_id) {
        const branchCheck = await db.query(
          'SELECT id FROM branches WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL',
          [branch_id, tenantId]
        );
        if (branchCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Not Found', message: 'Branch not found for this tenant' });
        }
      }

      const result = await db.query(`
        UPDATE users
        SET branch_id = $3::uuid, updated_at = NOW()
        WHERE id = $1::uuid AND tenant_id = $2::uuid AND is_active = true
        RETURNING id, name, email, role, branch_id
      `, [id, tenantId, branch_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'User not found for this tenant' });
      }
      await logAdminAction(tenantId, req.user?.id, 'assign_branch', 'user', id, undefined, { branch_id });
      res.json(result.rows[0]);
    } catch (err: any) {
      logger.error('Assign branch error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to assign branch' });
    }
  }

  // GET /api/admin/stats/chart?branch_id= — monthly points trend for charting
  static async getStatsChart(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const branchId = (req.query.branch_id as string | undefined) || undefined;

      if (branchId) {
        await AnalyticsService.verifyBranchOwnership(tenantId, branchId);
        const branchChart = await db.query(`
          SELECT
            to_char(wl.created_at, 'MM') AS month_num,
            EXTRACT(YEAR FROM wl.created_at) AS year,
            SUM(CASE WHEN wl.type = 'earned' AND t.branch_id = $2::uuid THEN wl.points ELSE 0 END) AS points_earned,
            SUM(CASE WHEN wl.type = 'redeemed' AND rd.branch_id = $2::uuid THEN wl.points ELSE 0 END) AS points_redeemed
          FROM wallet_ledger wl
          LEFT JOIN transactions t ON wl.reference_type = 'transaction' AND wl.reference_id = t.id
          LEFT JOIN redemptions rd ON wl.reference_type = 'redemption' AND wl.reference_id = rd.id
          WHERE wl.tenant_id = $1::uuid
            AND wl.created_at > NOW() - INTERVAL '6 months'
            AND (t.branch_id = $2::uuid OR rd.branch_id = $2::uuid)
          GROUP BY year, month_num
          ORDER BY year, month_num
        `, [tenantId, branchId]);
        return res.json(branchChart.rows);
      }

      const result = await db.query(`
        SELECT
          to_char(created_at, 'MM') AS month_num,
          EXTRACT(YEAR FROM created_at) AS year,
          SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END) AS points_earned,
          SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) AS points_redeemed
        FROM wallet_ledger
        WHERE tenant_id = $1::uuid
          AND created_at > NOW() - INTERVAL '6 months'
        GROUP BY year, month_num
        ORDER BY year, month_num
      `, [tenantId]);

      res.json(result.rows);
    } catch (err: any) {
      if (err instanceof AnalyticsError && err.code === 'BRANCH_NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Chart stats error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch chart data' });
    }
  }

  // GET /api/admin/tiers — tenant-specific tiers (falling back to system defaults)
  static async getTierBenefits(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const result = await db.query(`
        SELECT tier_name, multiplier::float8 AS multiplier, hierarchy_rank, min_earned_points
        FROM (
          SELECT DISTINCT ON (tier_name)
                 tier_name, multiplier, hierarchy_rank, min_earned_points
          FROM tier_benefits
          WHERE tenant_id = $1::uuid OR tenant_id IS NULL
          ORDER BY tier_name, tenant_id NULLS LAST
        ) resolved
        ORDER BY hierarchy_rank ASC
      `, [tenantId]);
      res.json(result.rows);
    } catch (err: any) {
      logger.error('Get tier benefits error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch tier settings' });
    }
  }

  // PUT /api/admin/tiers — upsert tenant-specific tier multipliers and thresholds
  static async updateTierBenefits(req: AuthenticatedRequest, res: Response) {
    const tenantId = req.user!.tenant_id;
    const { tiers } = req.body as {
      tiers: Array<{ tier_name: 'bronze' | 'silver' | 'gold' | 'platinum'; multiplier: number; min_earned_points: number }>;
    };
    const TIER_RANK_MAP: Record<string, number> = {
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4,
    };

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      for (const tier of tiers) {
        const rank = TIER_RANK_MAP[tier.tier_name];
        await client.query(`
          INSERT INTO tier_benefits (tenant_id, tier_name, multiplier, hierarchy_rank, min_earned_points)
          VALUES ($1::uuid, $2::tier_type, $3, $4, $5)
          ON CONFLICT (tenant_id, tier_name) DO UPDATE SET
            multiplier = EXCLUDED.multiplier,
            hierarchy_rank = EXCLUDED.hierarchy_rank,
            min_earned_points = EXCLUDED.min_earned_points,
            updated_at = NOW()
        `, [tenantId, tier.tier_name, tier.multiplier, rank, tier.min_earned_points]);
      }

      await client.query('COMMIT');
      await logAdminAction(tenantId, req.user?.id, 'update_tiers', 'tenant', tenantId, undefined, { tiers });

      const updated = await db.query(`
        SELECT tier_name, multiplier::float8 AS multiplier, hierarchy_rank, min_earned_points
        FROM (
          SELECT DISTINCT ON (tier_name)
                 tier_name, multiplier, hierarchy_rank, min_earned_points
          FROM tier_benefits
          WHERE tenant_id = $1::uuid OR tenant_id IS NULL
          ORDER BY tier_name, tenant_id NULLS LAST
        ) resolved
        ORDER BY hierarchy_rank ASC
      `, [tenantId]);
      res.json(updated.rows);
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error('Update tier benefits error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to update tier settings' });
    } finally {
      client.release();
    }
  }

  // GET /api/admin/analytics/retention?branch_id=
  static async getRetentionAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const branchId = (req.query.branch_id as string | undefined) || undefined;
      const analytics = await AnalyticsService.getRetentionAnalytics(tenantId, branchId);
      return res.json(analytics);
    } catch (err: any) {
      if (err instanceof AnalyticsError && err.code === 'BRANCH_NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Retention analytics error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch retention analytics' });
    }
  }
}
