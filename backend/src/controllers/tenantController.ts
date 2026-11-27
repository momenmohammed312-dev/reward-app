import { Response } from 'express';
import crypto from 'crypto';
import db from '../config/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { logger } from '../services/logger.js';

export class TenantController {
  /**
   * Public endpoint: get tenant by slug (for customer app discovery).
   */
  static async getTenantBySlug(req: AuthenticatedRequest, res: Response) {
    try {
      const { slug } = req.params;
      const result = await db.query(
        `SELECT id, name, slug, logo_url, primary_color, accent_color, bg_color, surface_color,
                font_display, font_body, tagline, points_per_egp, min_purchase_egp,
                business_type, code_prefix, show_menu, point_value_egp, tier_basis, refund_policy
         FROM tenants WHERE slug = $1 AND is_active = true`,
        [slug]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }
      res.json(result.rows[0]);
    } catch (err: any) {
      logger.error('Public tenant error:', { error: (err as Error).message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Creates a new Tenant (SaaS customer registration).
   * Usually called by Super Admin or public landing page signup.
   */
  static async createTenant(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, slug, plan, business_type, code_prefix, show_menu } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ error: 'Missing fields', message: 'name and slug are required' });
      }

      const resolvedBusinessType = ['cafe', 'supermarket', 'retail'].includes(business_type) ? business_type : 'cafe';
      const resolvedCodePrefix = (code_prefix ? String(code_prefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : '') || 'MO2';
      const resolvedShowMenu = typeof show_menu === 'boolean' ? show_menu : resolvedBusinessType !== 'supermarket';

      const result = await db.query(
        `INSERT INTO tenants (name, slug, plan, business_type, code_prefix, show_menu)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, slug, plan || 'starter', resolvedBusinessType, resolvedCodePrefix, resolvedShowMenu]
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
        return res.status(409).json({ error: 'Conflict', message: 'A store with this slug already exists' });
      }
      logger.error('Create tenant error', error);
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
          WHERE t.id = $1::uuid`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Get tenant error', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Updates the authenticated tenant's settings.
   * Uses COALESCE to only update provided fields.
   */
  static async updateTenant(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      const {
        name, points_per_egp, min_purchase_egp, points_expiry_days,
        logo_url, primary_color, accent_color, bg_color, surface_color,
        font_display, font_body, tagline,
        business_type, code_prefix, show_menu,
        cashier_max_invoice_egp, point_value_egp, welcome_bonus_points, excluded_item_keywords,
        tier_basis, refund_policy, cashier_daily_manual_limit, expiry_sms_days_before,
      } = req.body;

      const resolvedBusinessType = business_type && ['cafe', 'supermarket', 'retail'].includes(business_type)
        ? business_type
        : null;
      const resolvedCodePrefix = code_prefix
        ? (String(code_prefix).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || null)
        : null;
      const hasCashierMax = Object.prototype.hasOwnProperty.call(req.body, 'cashier_max_invoice_egp');
      const hasDailyManualLimit = Object.prototype.hasOwnProperty.call(req.body, 'cashier_daily_manual_limit');
      const hasExcluded = Array.isArray(excluded_item_keywords);

      const result = await db.query(
        `UPDATE tenants SET
          name = COALESCE($1, name),
          points_per_egp = COALESCE($2, points_per_egp),
          min_purchase_egp = COALESCE($3, min_purchase_egp),
          points_expiry_days = COALESCE($4, points_expiry_days),
          logo_url = COALESCE($5, logo_url),
          primary_color = COALESCE($6, primary_color),
          accent_color = COALESCE($7, accent_color),
          bg_color = COALESCE($8, bg_color),
          surface_color = COALESCE($9, surface_color),
          font_display = COALESCE($10, font_display),
          font_body = COALESCE($11, font_body),
          tagline = COALESCE($12, tagline),
          business_type = COALESCE($13, business_type),
          code_prefix = COALESCE($14, code_prefix),
          show_menu = COALESCE($15, show_menu),
          cashier_max_invoice_egp = CASE WHEN $16::boolean THEN $17::numeric ELSE cashier_max_invoice_egp END,
          point_value_egp = COALESCE($18, point_value_egp),
          welcome_bonus_points = COALESCE($19, welcome_bonus_points),
          excluded_item_keywords = CASE WHEN $20::boolean THEN $21::text[] ELSE excluded_item_keywords END,
          tier_basis = COALESCE($22, tier_basis),
          refund_policy = COALESCE($23, refund_policy),
          cashier_daily_manual_limit = CASE WHEN $24::boolean THEN $25::integer ELSE cashier_daily_manual_limit END,
          expiry_sms_days_before = COALESCE($26, expiry_sms_days_before)
         WHERE id = $27::uuid
         RETURNING *`,
        [
          name ?? null, points_per_egp ?? null, min_purchase_egp ?? null, points_expiry_days ?? null,
          logo_url ?? null, primary_color ?? null, accent_color ?? null, bg_color ?? null,
          surface_color ?? null, font_display ?? null, font_body ?? null, tagline ?? null,
          resolvedBusinessType, resolvedCodePrefix, typeof show_menu === 'boolean' ? show_menu : null,
          hasCashierMax, hasCashierMax ? (cashier_max_invoice_egp ?? null) : null,
          point_value_egp ?? null,
          welcome_bonus_points ?? null,
          hasExcluded,
          hasExcluded ? excluded_item_keywords : null,
          tier_basis ?? null,
          refund_policy ?? null,
          hasDailyManualLimit,
          hasDailyManualLimit ? (cashier_daily_manual_limit ?? null) : null,
          expiry_sms_days_before ?? null,
          tenantId,
        ]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Update tenant error', error);
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
      logger.error('Create branch error', error);
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
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL`,
        [tenantId]
      );

      res.json(result.rows);
    } catch (error) {
      logger.error('Get branches error', error);
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
         WHERE id = $2::uuid AND tenant_id = $3::uuid AND deleted_at IS NULL
         RETURNING id, name, api_key`,
        [apiKey, branch_id, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Branch not found under this tenant' });
      }

      res.json({ message: 'API key regenerated successfully', branch: result.rows[0] });
    } catch (error) {
      logger.error('Regenerate API key error', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
