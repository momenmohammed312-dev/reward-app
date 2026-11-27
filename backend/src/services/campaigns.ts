import db from '../config/db.js';

export class CampaignsError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND',
    message: string
  ) {
    super(message);
    this.name = 'CampaignsError';
  }
}

export interface CampaignInput {
  name: string;
  description?: string | null;
  campaign_type?: 'happy_hour' | 'multiplier' | 'double_points';
  multiplier: number;
  days_of_week?: number[] | null;
  start_hour?: number | null;
  end_hour?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
}

export class CampaignsService {
  static async listCampaigns(tenantId: string) {
    const res = await db.query(
      `SELECT id, name, description, campaign_type, multiplier::float8 AS multiplier,
              days_of_week, start_hour, end_hour, starts_at, ends_at, is_active, created_at
       FROM campaigns
       WHERE tenant_id = $1::uuid AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  static async createCampaign(tenantId: string, adminUserId: string | undefined, data: CampaignInput) {
    const res = await db.query(
      `INSERT INTO campaigns
         (tenant_id, name, description, campaign_type, multiplier, days_of_week, start_hour, end_hour, starts_at, ends_at, is_active)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::integer[], $7, $8, $9::timestamptz, $10::timestamptz, $11)
       RETURNING id, name, description, campaign_type, multiplier::float8 AS multiplier,
                 days_of_week, start_hour, end_hour, starts_at, ends_at, is_active, created_at`,
      [
        tenantId,
        data.name.trim(),
        data.description || null,
        data.campaign_type || 'happy_hour',
        data.multiplier,
        data.days_of_week ?? null,
        data.start_hour ?? null,
        data.end_hour ?? null,
        data.starts_at || null,
        data.ends_at || null,
        data.is_active ?? true,
      ]
    );

    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id, new_value)
       VALUES ($1::uuid, $2::uuid, 'create_campaign', 'campaign', $3::uuid, $4::jsonb)`,
      [tenantId, adminUserId || null, res.rows[0].id, JSON.stringify({ name: data.name, multiplier: data.multiplier })]
    ).catch(() => {});

    return res.rows[0];
  }

  static async updateCampaign(
    tenantId: string,
    adminUserId: string | undefined,
    campaignId: string,
    data: Partial<CampaignInput>
  ) {
    const hasDays = Object.prototype.hasOwnProperty.call(data, 'days_of_week');
    const hasStartHour = Object.prototype.hasOwnProperty.call(data, 'start_hour');
    const hasEndHour = Object.prototype.hasOwnProperty.call(data, 'end_hour');
    const hasStartsAt = Object.prototype.hasOwnProperty.call(data, 'starts_at');
    const hasEndsAt = Object.prototype.hasOwnProperty.call(data, 'ends_at');

    const res = await db.query(
      `UPDATE campaigns
       SET name = COALESCE($3, name),
           description = COALESCE($4, description),
           campaign_type = COALESCE($5, campaign_type),
           multiplier = COALESCE($6, multiplier),
           days_of_week = CASE WHEN $7::boolean THEN $8::integer[] ELSE days_of_week END,
           start_hour = CASE WHEN $9::boolean THEN $10::integer ELSE start_hour END,
           end_hour = CASE WHEN $11::boolean THEN $12::integer ELSE end_hour END,
           starts_at = CASE WHEN $13::boolean THEN $14::timestamptz ELSE starts_at END,
           ends_at = CASE WHEN $15::boolean THEN $16::timestamptz ELSE ends_at END,
           is_active = COALESCE($17, is_active),
           updated_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
       RETURNING id, name, description, campaign_type, multiplier::float8 AS multiplier,
                 days_of_week, start_hour, end_hour, starts_at, ends_at, is_active, created_at`,
      [
        campaignId,
        tenantId,
        data.name?.trim() || null,
        data.description ?? null,
        data.campaign_type || null,
        data.multiplier ?? null,
        hasDays,
        hasDays ? (data.days_of_week ?? null) : null,
        hasStartHour,
        hasStartHour ? (data.start_hour ?? null) : null,
        hasEndHour,
        hasEndHour ? (data.end_hour ?? null) : null,
        hasStartsAt,
        hasStartsAt ? (data.starts_at || null) : null,
        hasEndsAt,
        hasEndsAt ? (data.ends_at || null) : null,
        data.is_active ?? null,
      ]
    );

    if (res.rows.length === 0) {
      throw new CampaignsError('NOT_FOUND', 'Campaign not found');
    }

    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id, new_value)
       VALUES ($1::uuid, $2::uuid, 'update_campaign', 'campaign', $3::uuid, $4::jsonb)`,
      [tenantId, adminUserId || null, campaignId, JSON.stringify(data)]
    ).catch(() => {});

    return res.rows[0];
  }

  static async deleteCampaign(tenantId: string, adminUserId: string | undefined, campaignId: string) {
    const res = await db.query(
      `UPDATE campaigns SET deleted_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
       RETURNING id`,
      [campaignId, tenantId]
    );
    if (res.rows.length === 0) {
      throw new CampaignsError('NOT_FOUND', 'Campaign not found');
    }

    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id)
       VALUES ($1::uuid, $2::uuid, 'delete_campaign', 'campaign', $3::uuid)`,
      [tenantId, adminUserId || null, campaignId]
    ).catch(() => {});

    return { message: 'Campaign deleted', id: campaignId };
  }

  /**
   * Lists customers eligible for WhatsApp reactivation ('inactive') or expiry ('expiring') reminders.
   */
  static async getReminderTargets(
    tenantId: string,
    opts: { type: 'inactive' | 'expiring'; days: number }
  ) {
    const tenantRes = await db.query(
      'SELECT name, slug, points_expiry_days FROM tenants WHERE id = $1::uuid',
      [tenantId]
    );
    if (tenantRes.rows.length === 0) {
      throw new CampaignsError('NOT_FOUND', 'Tenant not found');
    }
    const tenant = tenantRes.rows[0];

    if (opts.type === 'expiring') {
      const expiryDays = Number(tenant.points_expiry_days || 0);
      if (expiryDays <= 0) {
        return { storeName: tenant.name, storeSlug: tenant.slug, targets: [] };
      }

      const res = await db.query(
        `SELECT c.id, c.name, c.phone, c.tier,
                COALESCE(cb.current_balance, 0)::int AS balance,
                c.last_visit,
                GREATEST(0, ($2::int - EXTRACT(DAY FROM (NOW() - MIN(wl.created_at)))))::int AS days_until_expiry
         FROM customers c
         JOIN customer_balances cb ON c.id = cb.customer_id AND cb.tenant_id = c.tenant_id
         JOIN wallet_ledger wl ON wl.customer_id = c.id AND wl.tenant_id = c.tenant_id
           AND wl.type IN ('earned', 'bonus', 'refund', 'adjustment')
         WHERE c.tenant_id = $1::uuid
           AND c.deleted_at IS NULL
           AND cb.current_balance > 0
           AND wl.created_at <= NOW() - (($2::int - $3::int) * INTERVAL '1 day')
           AND wl.created_at > NOW() - ($2::int * INTERVAL '1 day')
         GROUP BY c.id, c.name, c.phone, c.tier, cb.current_balance, c.last_visit
         ORDER BY cb.current_balance DESC
         LIMIT 100`,
        [tenantId, expiryDays, opts.days]
      );
      return { storeName: tenant.name, storeSlug: tenant.slug, targets: res.rows };
    }

    const res = await db.query(
      `SELECT c.id, c.name, c.phone, c.tier,
              COALESCE(cb.current_balance, 0)::int AS balance,
              c.last_visit,
              EXTRACT(DAY FROM (NOW() - COALESCE(c.last_visit, c.created_at)))::int AS days_since_visit
       FROM customers c
       LEFT JOIN customer_balances cb ON c.id = cb.customer_id AND cb.tenant_id = c.tenant_id
       WHERE c.tenant_id = $1::uuid
         AND c.deleted_at IS NULL
         AND COALESCE(c.last_visit, c.created_at) < NOW() - ($2::int * INTERVAL '1 day')
       ORDER BY COALESCE(cb.current_balance, 0) DESC, c.last_visit ASC NULLS LAST
       LIMIT 100`,
      [tenantId, opts.days]
    );
    return { storeName: tenant.name, storeSlug: tenant.slug, targets: res.rows };
  }

  static async logReminderSent(
    tenantId: string,
    adminUserId: string | undefined,
    customerId: string,
    channel: 'whatsapp' | 'sms',
    reminderType: 'inactive' | 'expiring'
  ) {
    const custRes = await db.query(
      'SELECT id FROM customers WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL',
      [customerId, tenantId]
    );
    if (custRes.rows.length === 0) {
      throw new CampaignsError('NOT_FOUND', 'Customer not found');
    }

    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id, new_value)
       VALUES ($1::uuid, $2::uuid, 'send_reminder', 'customer', $3::uuid, $4::jsonb)`,
      [tenantId, adminUserId || null, customerId, JSON.stringify({ channel, reminder_type: reminderType })]
    );

    return { success: true };
  }
}
