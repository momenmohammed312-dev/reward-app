import { Response } from 'express';
import db from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export class AdminController {

  // GET /api/admin/stats
  static async getStats(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const statsQuery = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM customers WHERE tenant_id = $1) AS total_customers,
          (SELECT COUNT(*) FROM customers WHERE tenant_id = $1 AND last_visit > NOW() - INTERVAL '30 days') AS active_customers,
          (SELECT COALESCE(SUM(points), 0) FROM wallet_ledger WHERE tenant_id = $1 AND type = 'earned' AND created_at > date_trunc('month', NOW())) AS points_this_month,
          (SELECT COUNT(*) FROM redemptions WHERE tenant_id = $1 AND created_at::date = CURRENT_DATE) AS redemptions_today
      `, [tenantId]);
      res.json(statsQuery.rows[0]);
    } catch (err: any) {
      console.error('Admin stats error:', err);
      res.status(500).json({ error: 'Failed to fetch stats', message: err.message });
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
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `, [tenantId]);
      res.json(result.rows);
    } catch (err: any) {
      console.error('Admin customers error:', err);
      res.status(500).json({ error: 'Failed to fetch customers', message: err.message });
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
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [tenantId]);
      res.json(result.rows);
    } catch (err: any) {
      console.error('Admin rewards error:', err);
      res.status(500).json({ error: 'Failed to fetch rewards', message: err.message });
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
        VALUES ($1, $2, 'free_item', $3, $4, $5, $6)
        RETURNING *
      `, [tenantId, title, points_required, description || null, category || 'مشروبات', expiry_days || 30]);

      res.status(201).json(result.rows[0]);
    } catch (err: any) {
      console.error('Create reward error:', err);
      res.status(500).json({ error: 'Failed to create reward', message: err.message });
    }
  }

  // GET /api/admin/branches
  static async getBranches(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user!.tenant_id;
      const result = await db.query(`
        SELECT id, name, city, pos_type, is_active, created_at
        FROM branches
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `, [tenantId]);
      res.json(result.rows);
    } catch (err: any) {
      console.error('Admin branches error:', err);
      res.status(500).json({ error: 'Failed to fetch branches', message: err.message });
    }
  }
}
