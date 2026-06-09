import { Response } from 'express';
import db from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { logger } from '../services/logger.js';

export class AdminController {

  // GET /api/admin/stats
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const statsQuery = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM customers WHERE tenant_id = $1::uuid) AS total_customers,
          (SELECT COUNT(*) FROM customers WHERE tenant_id = $1::uuid AND last_visit > NOW() - INTERVAL '30 days') AS active_customers,
          (SELECT COALESCE(SUM(points), 0) FROM wallet_ledger WHERE tenant_id = $1::uuid AND type = 'earned' AND created_at > date_trunc('month', NOW())) AS points_this_month,
          (SELECT COUNT(*) FROM redemptions WHERE tenant_id = $1::uuid AND created_at::date = CURRENT_DATE) AS redemptions_today
      `, [tenantId]);
      res.json(statsQuery.rows[0]);
    } catch (err: any) {
      logger.error('Admin stats error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  }

  // GET /api/admin/customers
  static async getCustomers(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const result = await db.query(`
        SELECT id, phone, name, tier, 
               COALESCE((SELECT SUM(CASE WHEN type IN ('earned','bonus','refund') THEN points WHEN type IN ('redeemed','expired') THEN -points ELSE 0 END) FROM wallet_ledger WHERE customer_id = c.id), 0) AS balance,
               total_earned, is_verified, last_visit, created_at
        FROM customers c
        WHERE tenant_id = $1::uuid
        ORDER BY created_at DESC
        LIMIT 100
      `, [tenantId]);
      res.json(result.rows);
    } catch (err: any) {
      logger.error('Admin customers error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch customers' });
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
               description,
               category,
               image_url AS "imageUrl",
               terms,
               expiry_days AS "expiryDays",
               is_active,
               created_at
        FROM rewards
        WHERE tenant_id = $1::uuid
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
      const { title, description, points_required, category, expiry_days } = req.body;
      
      if (!title || !points_required) {
        return res.status(400).json({ error: 'title and points_required are required' });
      }

      const result = await db.query(`
        INSERT INTO rewards (tenant_id, name, reward_type, required_points, description, category, expiry_days)
        VALUES ($1::uuid, $2, 'free_item', $3, $4, $5, $6)
        RETURNING *
      `, [tenantId, title, points_required, description || null, category || 'مشروبات', expiry_days || 30]);

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
        WHERE tenant_id = $1::uuid
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
      const { name, tier, is_verified } = req.body;

      const result = await db.query(`
        UPDATE customers
        SET name = COALESCE($2, name),
            tier = COALESCE($3, tier),
            is_verified = COALESCE($4, is_verified)
        WHERE id = $1::uuid AND tenant_id = $5::uuid
        RETURNING id, phone, name, tier, is_verified, last_visit, created_at
      `, [id, name || null, tier || null, is_verified ?? null, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      logger.error('Update customer error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  // DELETE /api/admin/customers/:id
  static async deleteCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;

      const result = await db.query(`
        DELETE FROM customers
        WHERE id = $1::uuid AND tenant_id = $2::uuid
        RETURNING id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
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
      const { title, description, points_required, category, expiry_days, is_active } = req.body;

      const result = await db.query(`
        UPDATE rewards
        SET name = COALESCE($3, name),
            description = COALESCE($4, description),
            required_points = COALESCE($5, required_points),
            category = COALESCE($6, category),
            expiry_days = COALESCE($7, expiry_days),
            is_active = COALESCE($8, is_active)
        WHERE id = $1::uuid AND tenant_id = $2::uuid
        RETURNING id, name AS title, reward_type, required_points AS "pointsRequired",
                  description, category, image_url AS "imageUrl", terms,
                  expiry_days AS "expiryDays", is_active, created_at
      `, [id, tenantId, title || null, description ?? null, points_required ? Number(points_required) : null, category || null, expiry_days ? Number(expiry_days) : null, is_active ?? null]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Reward not found' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      logger.error('Update reward error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to update reward' });
    }
  }

  // DELETE /api/admin/rewards/:id
  static async deleteReward(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;

      const result = await db.query(`
        DELETE FROM rewards
        WHERE id = $1::uuid AND tenant_id = $2::uuid
        RETURNING id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Reward not found' });
      }
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
      const { name, city, pos_type } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      const result = await db.query(`
        INSERT INTO branches (tenant_id, name, city, pos_type)
        VALUES ($1::uuid, $2, $3, $4)
        RETURNING id, name, city, pos_type, is_active, created_at
      `, [tenantId, name, city || null, pos_type || 'Manual']);

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
      const { name, city, pos_type, is_active } = req.body;

      const result = await db.query(`
        UPDATE branches
        SET name = COALESCE($3, name),
            city = COALESCE($4, city),
            pos_type = COALESCE($5, pos_type),
            is_active = COALESCE($6, is_active)
        WHERE id = $1::uuid AND tenant_id = $2::uuid
        RETURNING id, name, city, pos_type, is_active, created_at
      `, [id, tenantId, name || null, city ?? null, pos_type || null, is_active ?? null]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      logger.error('Update branch error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to update branch' });
    }
  }

  // DELETE /api/admin/branches/:id
  static async deleteBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const { id } = req.params;

      const result = await db.query(`
        DELETE FROM branches
        WHERE id = $1::uuid AND tenant_id = $2::uuid
        RETURNING id
      `, [id, tenantId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Branch not found' });
      }
      res.json({ message: 'Branch deleted', id });
    } catch (err: any) {
      logger.error('Delete branch error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to delete branch' });
    }
  }

  // GET /api/admin/stats/chart — monthly points trend for charting
  static async getStatsChart(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const result = await db.query(`
        SELECT
          to_char(created_at, 'Mon') AS month,
          to_char(created_at, 'MM') AS month_num,
          EXTRACT(YEAR FROM created_at) AS year,
          SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END) AS points_earned,
          SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) AS points_redeemed
        FROM wallet_ledger
        WHERE tenant_id = $1::uuid
          AND created_at > NOW() - INTERVAL '6 months'
        GROUP BY year, month_num, month
        ORDER BY year, month_num
      `, [tenantId]);

      res.json(result.rows);
    } catch (err: any) {
      logger.error('Chart stats error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Failed to fetch chart data' });
    }
  }
}
