import { Response } from 'express';
import db from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export class SuperAdminController {

  // GET /api/superadmin/tenants
  static async getAllTenants(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await db.query(`
        SELECT id, name, slug, plan, is_active, points_per_egp, created_at,
               COALESCE((SELECT COUNT(*) FROM customers WHERE tenant_id = t.id), 0) AS customer_count,
               COALESCE((SELECT COUNT(*) FROM branches WHERE tenant_id = t.id), 0) AS branch_count
        FROM tenants t
        ORDER BY created_at DESC
      `);
      res.json(result.rows);
    } catch (err: any) {
      console.error('SuperAdmin tenants error:', err);
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  }

  // PATCH /api/superadmin/tenants/:id
  static async toggleTenantStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const tenant = await db.query(
        'SELECT is_active FROM tenants WHERE id = $1',
        [id]
      );
      if (tenant.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }
      const newStatus = !tenant.rows[0].is_active;
      await db.query(
        'UPDATE tenants SET is_active = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, id]
      );
      res.json({ id, is_active: newStatus });
    } catch (err: any) {
      console.error('SuperAdmin toggle tenant error:', err);
      res.status(500).json({ error: 'Failed to update tenant' });
    }
  }

  // GET /api/superadmin/webhook-logs
  static async getWebhookLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await db.query(`
        SELECT wl.id, t.name AS tenant_name, wl.pos_type, wl.event_type, wl.status, wl.error_message, wl.created_at
        FROM webhook_logs wl
        LEFT JOIN tenants t ON wl.tenant_id = t.id
        ORDER BY wl.created_at DESC
        LIMIT 50
      `);
      res.json(result.rows);
    } catch (err: any) {
      console.error('SuperAdmin webhook logs error:', err);
      res.status(500).json({ error: 'Failed to fetch webhook logs' });
    }
  }

  // GET /api/superadmin/stats
  static async getGlobalStats(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await db.query(`
        SELECT
          (SELECT COUNT(*) FROM tenants) AS total_tenants,
          (SELECT COUNT(*) FROM tenants WHERE is_active = true) AS active_tenants,
          (SELECT COUNT(*) FROM customers) AS total_customers,
          (SELECT COUNT(*) FROM webhook_logs WHERE created_at > NOW() - INTERVAL '24 hours') AS webhooks_last_24h
      `);
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error('SuperAdmin stats error:', err);
      res.status(500).json({ error: 'Failed to fetch global stats' });
    }
  }
}
