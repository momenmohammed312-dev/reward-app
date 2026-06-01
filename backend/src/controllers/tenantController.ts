import { Response } from 'express';
import crypto from 'crypto';
import db from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export class TenantController {
  /**
   * Public endpoint: get tenant by slug (for customer app discovery).
   */
  static async getTenantBySlug(req: AuthenticatedRequest, res: Response) {
    try {
      const { slug } = req.params;
      const result = await db.query(
        `SELECT id, name, slug, logo_url, primary_color, accent_color, bg_color, surface_color, font_display, font_body, tagline, points_per_egp, min_purchase_egp
         FROM tenants WHERE slug = $1 AND is_active = true`,
        [slug]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      console.error('Public tenant error:', err);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Creates a new Tenant (SaaS customer registration).
   * Usually called by Super Admin or public landing page signup.
   */
  static async createTenant(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, slug, plan } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ error: 'Missing fields', message: 'name and slug are required' });
      }

      const result = await db.query(
        `INSERT INTO tenants (name, slug, plan)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, slug, plan || 'starter']
      );

      // Create a default subscription for the tenant (14-day trial)
      const tenant = result.rows[0];
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await db.query(
        `INSERT INTO subscriptions (tenant_id, status, current_period_end)
         VALUES ($1, 'trialing', $2)`,
        [tenant.id, trialEnd]
      );

      res.status(201).json({ message: 'Tenant created successfully with 14-day trial', tenant });
    } catch (error: any) {
      if (error.code === '23505') { // Unique slug violation
        return res.status(409).json({ error: 'Conflict', message: 'A cafe with this slug already exists' });
      }
      console.error('Create tenant error', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Gets details of the authenticated tenant.
   */
  static async getTenant(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;

      const result = await db.query(
        `SELECT t.*, s.status as subscription_status, s.current_period_end
         FROM tenants t
         LEFT JOIN subscriptions s ON t.id = s.tenant_id
         WHERE t.id = $1`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get tenant error', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Creates a new branch for the authenticated tenant.
   */
  static async createBranch(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      const { name, city, pos_type, pos_location_id } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Missing fields', message: 'name is required' });
      }

      // Generate a secure unique API key for POS integration
      const apiKey = `pk_${crypto.randomBytes(24).toString('hex')}`;

      const result = await db.query(
        `INSERT INTO branches (tenant_id, name, city, pos_type, pos_location_id, api_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [tenantId, name, city || null, pos_type || 'manual', pos_location_id || null, apiKey]
      );

      res.status(201).json({ message: 'Branch created successfully', branch: result.rows[0] });
    } catch (error) {
      console.error('Create branch error', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Lists all branches for the authenticated tenant.
   */
  static async getBranches(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;

      const result = await db.query(
        `SELECT id, name, city, pos_type, pos_location_id, is_active, created_at
         FROM branches
         WHERE tenant_id = $1`,
        [tenantId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Get branches error', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Regenerates a branch POS API key.
   */
  static async regenerateBranchApiKey(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      const { branch_id } = req.params;

      if (!branch_id) {
        return res.status(400).json({ error: 'Missing fields', message: 'branch_id parameter is required' });
      }

      const apiKey = `pk_${crypto.randomBytes(24).toString('hex')}`;

      const result = await db.query(
        `UPDATE branches
         SET api_key = $1
         WHERE id = $2 AND tenant_id = $3
         RETURNING id, name, api_key`,
        [apiKey, branch_id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Branch not found under this tenant' });
      }

      res.json({ message: 'API key regenerated successfully', branch: result.rows[0] });
    } catch (error) {
      console.error('Regenerate API key error', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
