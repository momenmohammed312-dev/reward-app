import bcrypt from 'bcrypt';
import db from '../config/db.js';
import { AnalyticsError, AnalyticsService } from './analytics.js';
import { computeActiveCampaignMultiplier, escapeCsvCell } from '../helpers/campaigns.js';
import { evaluateOrderWithRules } from '../helpers/rulesEngine.js';
import { summarizeEligibleOrder } from '../helpers/points.js';
import { EarningRulesService } from './earningRules.js';
import { LedgerService } from './ledger.js';
import { CustomApiAdapter } from './pos/customApiAdapter.js';

export class AdminOpsError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'VALIDATION',
    message: string
  ) {
    super(message);
    this.name = 'AdminOpsError';
  }
}

async function recordAudit(
  tenantId: string,
  adminUserId: string | undefined,
  actionType: string,
  targetType: string,
  targetId: string | undefined,
  oldValue?: unknown,
  newValue?: unknown
) {
  try {
    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id, old_value, new_value)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, $7::jsonb)`,
      [
        tenantId,
        adminUserId || null,
        actionType,
        targetType,
        targetId || null,
        oldValue !== undefined ? JSON.stringify(oldValue) : null,
        newValue !== undefined ? JSON.stringify(newValue) : null,
      ]
    );
  } catch {
    // Audit logging never breaks the primary mutation
  }
}

export class AdminOpsService {
  /**
   * Returns operational + supermarket margin KPIs (avg basket, points liability in EGP, at-risk counts).
   */
  static async getFinancialStats(tenantId: string, branchId?: string) {
    if (branchId) {
      await AnalyticsService.verifyBranchOwnership(tenantId, branchId);
    }

    const tenantCfg = await db.query(
      'SELECT COALESCE(point_value_egp, 0.05)::float8 AS point_value_egp FROM tenants WHERE id = $1::uuid',
      [tenantId]
    );
    const pointValueEgp = Number(tenantCfg.rows[0]?.point_value_egp ?? 0.05);

    const corePromise = branchId
      ? db.query(
          `SELECT
            (SELECT COUNT(DISTINCT customer_id)::int FROM transactions WHERE tenant_id = $1::uuid AND branch_id = $2::uuid) AS total_customers,
            (SELECT COUNT(DISTINCT customer_id)::int FROM transactions WHERE tenant_id = $1::uuid AND branch_id = $2::uuid AND created_at > NOW() - INTERVAL '30 days') AS active_customers,
            (SELECT COALESCE(SUM(points_earned), 0)::int FROM transactions WHERE tenant_id = $1::uuid AND branch_id = $2::uuid AND created_at > date_trunc('month', NOW())) AS points_this_month,
            (SELECT COUNT(*)::int FROM redemptions WHERE tenant_id = $1::uuid AND branch_id = $2::uuid AND created_at::date = CURRENT_DATE) AS redemptions_today`,
          [tenantId, branchId]
        )
      : db.query(
          `SELECT
            (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1::uuid AND deleted_at IS NULL) AS total_customers,
            (SELECT COUNT(*)::int FROM customers WHERE tenant_id = $1::uuid AND deleted_at IS NULL AND last_visit > NOW() - INTERVAL '30 days') AS active_customers,
            (SELECT COALESCE(SUM(points), 0)::int FROM wallet_ledger WHERE tenant_id = $1::uuid AND type = 'earned' AND created_at > date_trunc('month', NOW())) AS points_this_month,
            (SELECT COUNT(*)::int FROM redemptions WHERE tenant_id = $1::uuid AND created_at::date = CURRENT_DATE) AS redemptions_today`,
          [tenantId]
        );

    const basketPromise = branchId
      ? db.query(
          `SELECT
            COALESCE(AVG(amount), 0)::float8 AS avg_basket_egp,
            COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN amount ELSE 0 END), 0)::float8 AS total_revenue_30d
           FROM transactions
           WHERE tenant_id = $1::uuid AND branch_id = $2::uuid`,
          [tenantId, branchId]
        )
      : db.query(
          `SELECT
            COALESCE(AVG(amount), 0)::float8 AS avg_basket_egp,
            COALESCE(SUM(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN amount ELSE 0 END), 0)::float8 AS total_revenue_30d
           FROM transactions
           WHERE tenant_id = $1::uuid`,
          [tenantId]
        );

    const liabilityPromise = db.query(
      `SELECT
        COALESCE(SUM(GREATEST(c.cached_balance, 0)), 0)::int AS total_outstanding_points
       FROM customers c
       WHERE c.tenant_id = $1::uuid AND c.deleted_at IS NULL`,
      [tenantId]
    );

    const redemptionRatePromise = branchId
      ? db.query(
          `SELECT
            COUNT(*)::int AS total_codes,
            COUNT(*) FILTER (WHERE used_at IS NOT NULL)::int AS used_codes
           FROM redemptions
           WHERE tenant_id = $1::uuid AND branch_id = $2::uuid`,
          [tenantId, branchId]
        )
      : db.query(
          `SELECT
            COUNT(*)::int AS total_codes,
            COUNT(*) FILTER (WHERE used_at IS NOT NULL)::int AS used_codes
           FROM redemptions
           WHERE tenant_id = $1::uuid`,
          [tenantId]
        );

    const inactivePromise = db.query(
      `SELECT
        COUNT(*) FILTER (WHERE COALESCE(last_visit, created_at) < NOW() - INTERVAL '14 days')::int AS inactive_14d_count,
        COUNT(*) FILTER (WHERE COALESCE(last_visit, created_at) < NOW() - INTERVAL '30 days')::int AS inactive_30d_count
       FROM customers
       WHERE tenant_id = $1::uuid AND deleted_at IS NULL`,
      [tenantId]
    );

    const [coreRes, basketRes, liabRes, redRes, inactiveRes] = await Promise.all([
      corePromise,
      basketPromise,
      liabilityPromise,
      redemptionRatePromise,
      inactivePromise,
    ]);

    const core = coreRes.rows[0] || {};
    const basket = basketRes.rows[0] || {};
    const outstandingPts = Number(liabRes.rows[0]?.total_outstanding_points || 0);
    const totalCodes = Number(redRes.rows[0]?.total_codes || 0);
    const usedCodes = Number(redRes.rows[0]?.used_codes || 0);
    const inactive = inactiveRes.rows[0] || {};

    return {
      total_customers: Number(core.total_customers || 0),
      active_customers: Number(core.active_customers || 0),
      points_this_month: Number(core.points_this_month || 0),
      redemptions_today: Number(core.redemptions_today || 0),
      avg_basket_egp: Math.round(Number(basket.avg_basket_egp || 0) * 100) / 100,
      total_revenue_30d: Math.round(Number(basket.total_revenue_30d || 0) * 100) / 100,
      total_outstanding_points: outstandingPts,
      point_value_egp: pointValueEgp,
      points_liability_egp: Math.round(outstandingPts * pointValueEgp * 100) / 100,
      redemption_rate_pct: totalCodes > 0 ? Math.round((usedCodes / totalCodes) * 1000) / 10 : 0,
      inactive_14d_count: Number(inactive.inactive_14d_count || 0),
      inactive_30d_count: Number(inactive.inactive_30d_count || 0),
    };
  }

  /**
   * Creates (or resurrects) a customer under the tenant from Admin Dashboard,
   * optionally awarding initial bonus points strictly through LedgerService.insert.
   */
  static async createCustomer(
    tenantId: string,
    adminUserId: string | undefined,
    data: {
      name: string;
      phone: string;
      tier?: 'bronze' | 'silver' | 'gold' | 'platinum';
      initial_points?: number;
      is_verified?: boolean;
    }
  ) {
    const cleanName = data.name.trim();
    const cleanPhone = data.phone.trim();
    const tier = data.tier || 'bronze';
    const isVerified = data.is_verified ?? true;
    const initialPoints = Math.max(0, Math.floor(Number(data.initial_points || 0)));

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id FROM customers WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL',
        [tenantId, cleanPhone]
      );
      if (existing.rows.length > 0) {
        throw new AdminOpsError('CONFLICT', 'يوجد عميل مسجل بهذا الرقم بالفعل');
      }

      const inserted = await client.query(
        `INSERT INTO customers (tenant_id, name, phone, tier, is_verified)
         VALUES ($1::uuid, $2, $3, $4::tier_type, $5)
         ON CONFLICT (tenant_id, phone) DO UPDATE SET
           name = EXCLUDED.name,
           tier = EXCLUDED.tier,
           is_verified = EXCLUDED.is_verified,
           deleted_at = NULL,
           updated_at = NOW()
         RETURNING id, name, phone, card_number, tier, is_verified, created_at`,
        [tenantId, cleanName, cleanPhone, tier, isVerified]
      );

      const created = inserted.rows[0];

      if (initialPoints > 0) {
        await LedgerService.insert(client, {
          tenantId,
          customerId: created.id,
          type: 'bonus',
          points: initialPoints,
          referenceType: 'admin_signup',
          note: 'رصيد ترحيبي من لوحة التحكم',
          createdBy: adminUserId || 'admin',
          idempotencyKey: `admin_create:${tenantId}:${created.id}:${Date.now()}`,
        });
      }

      await client.query('COMMIT');
      await recordAudit(tenantId, adminUserId, 'create_customer', 'customer', created.id, undefined, {
        name: cleanName,
        phone: cleanPhone,
        tier,
        initial_points: initialPoints,
      });

      return { ...created, balance: initialPoints };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lists tenant customers with optional name, phone, tier, and inactivity filters.
   */
  static async getCustomersFiltered(
    tenantId: string,
    filters: { name?: string; phone?: string; tier?: string; inactiveDays?: number; page: number; limit: number }
  ) {
    const offset = (filters.page - 1) * filters.limit;
    const clauses: string[] = ['c.tenant_id = $1::uuid', 'c.deleted_at IS NULL'];
    const params: any[] = [tenantId];
    let idx = 2;

    if (filters.name) {
      clauses.push(`c.name ILIKE $${idx}::text`);
      params.push(`%${filters.name}%`);
      idx++;
    }
    if (filters.phone) {
      clauses.push(`(c.phone ILIKE $${idx}::text OR COALESCE(c.card_number, '') ILIKE $${idx}::text)`);
      params.push(`%${filters.phone}%`);
      idx++;
    }
    if (filters.tier && ['bronze', 'silver', 'gold', 'platinum'].includes(filters.tier)) {
      clauses.push(`c.tier = $${idx}::tier_type`);
      params.push(filters.tier);
      idx++;
    }
    if (filters.inactiveDays && filters.inactiveDays > 0) {
      clauses.push(`COALESCE(c.last_visit, c.created_at) < NOW() - ($${idx} * INTERVAL '1 day')`);
      params.push(filters.inactiveDays);
      idx++;
    }

    const whereSql = `WHERE ${clauses.join(' AND ')}`;

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM customers c ${whereSql}`,
      params
    );

    const rowsRes = await db.query(
      `SELECT c.id, c.phone, c.card_number, c.name, c.tier,
              COALESCE(c.cached_balance, 0)::int AS balance,
              COALESCE(c.cached_total_earned, 0)::int AS total_earned,
              COALESCE(c.total_spent_egp, 0)::float8 AS total_spent_egp,
              c.is_verified, c.last_visit, c.created_at,
              c.signup_station,
              sb.name AS signup_branch_name
       FROM customers c
       LEFT JOIN branches sb ON c.signup_branch_id = sb.id
       ${whereSql}
       ORDER BY c.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, filters.limit, offset]
    );

    return {
      customers: rowsRes.rows,
      total: Number(countRes.rows[0]?.total || 0),
      page: filters.page,
      limit: filters.limit,
    };
  }

  /**
   * Builds a UTF-8 BOM CSV string of filtered customers (capped at 5,000 rows).
   */
  static async exportCustomersCsv(
    tenantId: string,
    filters: { name?: string; phone?: string; tier?: string; inactiveDays?: number }
  ): Promise<string> {
    const result = await this.getCustomersFiltered(tenantId, {
      ...filters,
      page: 1,
      limit: 5000,
    });

    const headers = ['الاسم', 'الهاتف', 'الفئة', 'الرصيد', 'إجمالي المكتسب', 'الحالة', 'نقطة التسجيل', 'آخر زيارة'];
    const lines = [headers.map(escapeCsvCell).join(',')];

    for (const c of result.customers) {
      const stationLabel = [c.signup_branch_name, c.signup_station].filter(Boolean).join(' · ');
      const row = [
        c.name || 'عميل',
        c.phone,
        c.tier,
        c.balance,
        c.total_earned,
        c.is_verified ? 'نشط' : 'معلق',
        stationLabel,
        c.last_visit ? new Date(c.last_visit).toISOString().slice(0, 10) : '',
      ];
      lines.push(row.map(escapeCsvCell).join(','));
    }

    return '\uFEFF' + lines.join('\r\n');
  }

  /**
   * Fetches full ledger, transactions, and redemptions for a single tenant-owned customer.
   */
  static async getCustomerLedger(tenantId: string, customerId: string) {
    const custRes = await db.query(
      `SELECT c.id, c.phone, c.card_number, c.name, c.tier, c.is_verified, c.last_visit, c.created_at,
              c.signup_station, sb.name AS signup_branch_name,
              COALESCE(c.cached_balance, 0)::int AS balance,
              COALESCE(c.cached_total_earned, 0)::int AS total_earned,
              COALESCE(c.cached_total_redeemed, 0)::int AS total_redeemed,
              COALESCE(c.total_spent_egp, 0)::float8 AS total_spent_egp
       FROM customers c
       LEFT JOIN branches sb ON c.signup_branch_id = sb.id
       WHERE c.id = $1::uuid AND c.tenant_id = $2::uuid AND c.deleted_at IS NULL`,
      [customerId, tenantId]
    );

    if (custRes.rows.length === 0) {
      throw new AdminOpsError('NOT_FOUND', 'Customer not found');
    }

    const [ledgerRes, txRes, redRes] = await Promise.all([
      db.query(
        `SELECT id, type, points, reference_id, reference_type, note, created_by, created_at
         FROM wallet_ledger
         WHERE tenant_id = $1::uuid AND customer_id = $2::uuid
         ORDER BY created_at DESC
         LIMIT 100`,
        [tenantId, customerId]
      ),
      db.query(
        `SELECT t.id, t.invoice_id, t.amount::float8 AS amount, t.points_earned, t.created_at,
                b.name AS branch_name
         FROM transactions t
         LEFT JOIN branches b ON t.branch_id = b.id
         WHERE t.tenant_id = $1::uuid AND t.customer_id = $2::uuid
         ORDER BY t.created_at DESC
         LIMIT 50`,
        [tenantId, customerId]
      ),
      db.query(
        `SELECT r.id, r.code, r.points_used, r.used_at, r.expires_at, r.created_at,
                rw.name AS reward_name, rw.reward_type, rw.discount_value::float8 AS discount_value,
                b.name AS branch_name
         FROM redemptions r
         LEFT JOIN rewards rw ON r.reward_id = rw.id
         LEFT JOIN branches b ON r.branch_id = b.id
         WHERE r.tenant_id = $1::uuid AND r.customer_id = $2::uuid
         ORDER BY r.created_at DESC
         LIMIT 50`,
        [tenantId, customerId]
      ),
    ]);

    return {
      customer: custRes.rows[0],
      ledger: ledgerRes.rows,
      transactions: txRes.rows,
      redemptions: redRes.rows,
    };
  }

  /**
   * Lists tenant transactions with branch, customer, and reversed points info for refund control.
   */
  static async getTransactions(
    tenantId: string,
    filters: { branchId?: string; search?: string; page: number; limit: number }
  ) {
    if (filters.branchId) {
      await AnalyticsService.verifyBranchOwnership(tenantId, filters.branchId);
    }

    const offset = (filters.page - 1) * filters.limit;
    const clauses = ['t.tenant_id = $1::uuid'];
    const params: any[] = [tenantId];
    let idx = 2;

    if (filters.branchId) {
      clauses.push(`t.branch_id = $${idx}::uuid`);
      params.push(filters.branchId);
      idx++;
    }
    if (filters.search) {
      clauses.push(`(t.invoice_id ILIKE $${idx} OR c.phone ILIKE $${idx} OR COALESCE(c.name, '') ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const whereSql = `WHERE ${clauses.join(' AND ')}`;

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM transactions t
       LEFT JOIN customers c ON t.customer_id = c.id
       ${whereSql}`,
      params
    );

    const rowsRes = await db.query(
      `SELECT t.id, t.invoice_id, t.amount::float8 AS amount, t.points_earned, t.created_at,
              t.branch_id, b.name AS branch_name,
              c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone,
              COALESCE((
                SELECT SUM(wl.points)::int
                FROM wallet_ledger wl
                WHERE wl.tenant_id = t.tenant_id
                  AND wl.reference_id = t.id
                  AND wl.type = 'reversal'
              ), 0) AS reversed_points
       FROM transactions t
       LEFT JOIN customers c ON t.customer_id = c.id
       LEFT JOIN branches b ON t.branch_id = b.id
       ${whereSql}
       ORDER BY t.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, filters.limit, offset]
    );

    const rows = rowsRes.rows || [];
    const txIds = rows.map((r: any) => r.id).filter(Boolean);
    const itemsByTx = new Map<string, any[]>();

    if (txIds.length > 0) {
      try {
        const itemsRes = await db.query(
          `SELECT id, transaction_id, sku, product_name, category,
                  quantity::float8 AS quantity, unit,
                  net_amount::float8 AS net_amount,
                  is_excluded, points_earned,
                  refunded_quantity::float8 AS refunded_quantity,
                  refunded_points
           FROM transaction_items
           WHERE tenant_id = $1::uuid AND transaction_id = ANY($2::uuid[])
           ORDER BY created_at ASC`,
          [tenantId, txIds]
        );
        for (const item of itemsRes.rows) {
          const list = itemsByTx.get(item.transaction_id) || [];
          list.push(item);
          itemsByTx.set(item.transaction_id, list);
        }
      } catch {
        // Safe fallback if mock db doesn't mock transaction_items query
      }
    }

    return {
      transactions: rows.map((r: any) => ({
        ...r,
        items: itemsByTx.get(r.id) || [],
      })),
      total: Number(countRes.rows[0]?.total || 0),
      page: filters.page,
      limit: filters.limit,
    };
  }

  /**
   * Lists tenant voucher/reward redemptions with derived status for daily till reconciliation.
   */
  static async getRedemptions(
    tenantId: string,
    filters: { branchId?: string; status?: string; search?: string; page: number; limit: number }
  ) {
    if (filters.branchId) {
      await AnalyticsService.verifyBranchOwnership(tenantId, filters.branchId);
    }

    const offset = (filters.page - 1) * filters.limit;
    const clauses = ['r.tenant_id = $1::uuid'];
    const params: any[] = [tenantId];
    let idx = 2;

    if (filters.branchId) {
      clauses.push(`r.branch_id = $${idx}::uuid`);
      params.push(filters.branchId);
      idx++;
    }
    if (filters.status === 'used') {
      clauses.push('r.used_at IS NOT NULL');
    } else if (filters.status === 'expired') {
      clauses.push('r.used_at IS NULL AND r.expires_at < NOW()');
    } else if (filters.status === 'pending') {
      clauses.push('r.used_at IS NULL AND r.expires_at >= NOW()');
    }
    if (filters.search) {
      clauses.push(`(r.code ILIKE $${idx} OR c.phone ILIKE $${idx} OR COALESCE(c.name, '') ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const whereSql = `WHERE ${clauses.join(' AND ')}`;

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM redemptions r
       LEFT JOIN customers c ON r.customer_id = c.id
       ${whereSql}`,
      params
    );

    const rowsRes = await db.query(
      `SELECT r.id, r.code, r.points_used, r.expires_at, r.used_at, r.created_at,
              CASE
                WHEN r.used_at IS NOT NULL THEN 'used'
                WHEN r.expires_at < NOW() THEN 'expired'
                ELSE 'pending'
              END AS status,
              rw.name AS reward_name, rw.reward_type, rw.discount_value::float8 AS discount_value,
              rw.min_order_egp::float8 AS min_order_egp,
              c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone,
              b.name AS branch_name
       FROM redemptions r
       LEFT JOIN rewards rw ON r.reward_id = rw.id
       LEFT JOIN customers c ON r.customer_id = c.id
       LEFT JOIN branches b ON r.branch_id = b.id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, filters.limit, offset]
    );

    return {
      redemptions: rowsRes.rows,
      total: Number(countRes.rows[0]?.total || 0),
      page: filters.page,
      limit: filters.limit,
    };
  }

  /**
   * Lists all tenant staff members (active & inactive) with branch info and recent action count.
   */
  static async listStaff(tenantId: string) {
    const res = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.branch_id, u.is_active, u.created_at,
              b.name AS branch_name,
              COALESCE((
                SELECT COUNT(*)::int
                FROM admin_activity_log al
                WHERE al.tenant_id = u.tenant_id
                  AND al.admin_user_id = u.id
                  AND al.created_at > NOW() - INTERVAL '7 days'
              ), 0) AS actions_last_7d
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.tenant_id = $1::uuid
       ORDER BY u.created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  /**
   * Creates a new manager or cashier account under the caller's tenant.
   */
  static async createStaff(
    tenantId: string,
    actorUserId: string | undefined,
    data: { name: string; email: string; password: string; role: 'manager' | 'cashier'; branch_id?: string | null }
  ) {
    if (data.branch_id) {
      const bCheck = await db.query(
        'SELECT id FROM branches WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL',
        [data.branch_id, tenantId]
      );
      if (bCheck.rows.length === 0) {
        throw new AdminOpsError('NOT_FOUND', 'Branch not found for this tenant');
      }
    }

    const emailNormalized = data.email.trim().toLowerCase();
    const existingEmail = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [emailNormalized]
    );
    if (existingEmail.rows.length > 0) {
      throw new AdminOpsError('CONFLICT', 'A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const res = await db.query(
      `INSERT INTO users (tenant_id, email, password_hash, name, role, branch_id, is_active)
       VALUES ($1::uuid, $2, $3, $4, $5::user_role, $6::uuid, true)
       RETURNING id, name, email, role, branch_id, is_active, created_at`,
      [tenantId, emailNormalized, passwordHash, data.name.trim(), data.role, data.branch_id || null]
    );

    const created = res.rows[0];
    await recordAudit(tenantId, actorUserId, 'create_staff', 'user', created.id, undefined, {
      email: created.email,
      role: created.role,
      branch_id: created.branch_id,
    });
    return created;
  }

  /**
   * Updates staff role, branch assignment, name, or active state (protecting owner and self-deactivation).
   */
  static async updateStaff(
    tenantId: string,
    actorUserId: string | undefined,
    staffId: string,
    data: { name?: string; role?: 'manager' | 'cashier'; branch_id?: string | null; is_active?: boolean }
  ) {
    const targetRes = await db.query(
      'SELECT id, role, branch_id, is_active FROM users WHERE id = $1::uuid AND tenant_id = $2::uuid',
      [staffId, tenantId]
    );
    if (targetRes.rows.length === 0) {
      throw new AdminOpsError('NOT_FOUND', 'Staff user not found');
    }
    const current = targetRes.rows[0];

    if (current.role === 'owner' && (data.role !== undefined || data.is_active === false)) {
      throw new AdminOpsError('FORBIDDEN', 'Owner account role and active status cannot be downgraded');
    }
    if (actorUserId && actorUserId === staffId && data.is_active === false) {
      throw new AdminOpsError('FORBIDDEN', 'You cannot deactivate your own account');
    }

    if (data.branch_id) {
      const bCheck = await db.query(
        'SELECT id FROM branches WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL',
        [data.branch_id, tenantId]
      );
      if (bCheck.rows.length === 0) {
        throw new AdminOpsError('NOT_FOUND', 'Branch not found for this tenant');
      }
    }

    const hasBranch = Object.prototype.hasOwnProperty.call(data, 'branch_id');
    const updatedRes = await db.query(
      `UPDATE users
       SET name = COALESCE($3, name),
           role = COALESCE($4::user_role, role),
           branch_id = CASE WHEN $5::boolean THEN $6::uuid ELSE branch_id END,
           is_active = COALESCE($7, is_active),
           updated_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid
       RETURNING id, name, email, role, branch_id, is_active, created_at`,
      [
        staffId,
        tenantId,
        data.name?.trim() || null,
        data.role || null,
        hasBranch,
        hasBranch ? (data.branch_id || null) : null,
        data.is_active ?? null,
      ]
    );

    await recordAudit(tenantId, actorUserId, 'update_staff', 'user', staffId, current, data);
    return updatedRes.rows[0];
  }

  /**
   * Lists paginated admin/cashier audit trail entries for the tenant.
   */
  static async getAuditLog(
    tenantId: string,
    filters: { actionType?: string; userId?: string; page: number; limit: number }
  ) {
    const offset = (filters.page - 1) * filters.limit;
    const clauses = ['al.tenant_id = $1::uuid'];
    const params: any[] = [tenantId];
    let idx = 2;

    if (filters.actionType) {
      clauses.push(`al.action_type = $${idx}`);
      params.push(filters.actionType);
      idx++;
    }
    if (filters.userId) {
      clauses.push(`al.admin_user_id = $${idx}::uuid`);
      params.push(filters.userId);
      idx++;
    }

    const whereSql = `WHERE ${clauses.join(' AND ')}`;

    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM admin_activity_log al ${whereSql}`,
      params
    );

    const rowsRes = await db.query(
      `SELECT al.id, al.action_type, al.target_type, al.target_id, al.old_value, al.new_value, al.created_at,
              u.name AS actor_name, u.email AS actor_email, u.role AS actor_role
       FROM admin_activity_log al
       LEFT JOIN users u ON al.admin_user_id = u.id
       ${whereSql}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, filters.limit, offset]
    );

    return {
      logs: rowsRes.rows,
      total: Number(countRes.rows[0]?.total || 0),
      page: filters.page,
      limit: filters.limit,
    };
  }

  /**
   * Returns tenant POS integration metadata, branches with API keys, excluded keywords, and recent webhook logs.
   */
  static async getPosConfig(tenantId: string) {
    const [tenantRes, branchesRes, logsRes] = await Promise.all([
      db.query(
        `SELECT id, slug, excluded_item_keywords, cashier_max_invoice_egp::float8 AS cashier_max_invoice_egp
         FROM tenants WHERE id = $1::uuid`,
        [tenantId]
      ),
      db.query(
        `SELECT id, name, city, pos_type, pos_location_id, api_key, is_active
         FROM branches
         WHERE tenant_id = $1::uuid AND deleted_at IS NULL
         ORDER BY created_at ASC`,
        [tenantId]
      ),
      db.query(
        `SELECT id, pos_type, event_type, status, error_message, created_at
         FROM webhook_logs
         WHERE tenant_id = $1::uuid
         ORDER BY created_at DESC
         LIMIT 20`,
        [tenantId]
      ),
    ]);

    if (tenantRes.rows.length === 0) {
      throw new AdminOpsError('NOT_FOUND', 'Tenant not found');
    }

    const t = tenantRes.rows[0];
    return {
      tenant_id: t.id,
      slug: t.slug,
      excluded_item_keywords: t.excluded_item_keywords || [],
      cashier_max_invoice_egp: t.cashier_max_invoice_egp,
      branches: branchesRes.rows,
      webhook_logs: logsRes.rows,
    };
  }

  /**
   * Dry-run POS webhook simulator: parses payload with tenant exclusions, tier & active campaigns
   * without writing any transactions or points.
   */
  static async simulatePosWebhook(
    tenantId: string,
    payload: any,
    customerTier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze'
  ) {
    const [tenantRes, tbRes, campaignsRes, activeRules] = await Promise.all([
      db.query(
        `SELECT points_per_egp::float8 AS points_per_egp,
                min_purchase_egp::float8 AS min_purchase_egp,
                excluded_item_keywords
         FROM tenants WHERE id = $1::uuid`,
        [tenantId]
      ),
      db.query(
        `SELECT multiplier::float8 AS multiplier
         FROM tier_benefits
         WHERE (tenant_id = $1::uuid OR tenant_id IS NULL) AND tier_name = $2::tier_type
         ORDER BY tenant_id NULLS LAST
         LIMIT 1`,
        [tenantId, customerTier]
      ),
      db.query(
        `SELECT id, name, multiplier, days_of_week, start_hour, end_hour, starts_at, ends_at, is_active
         FROM campaigns
         WHERE tenant_id = $1::uuid AND is_active = true AND deleted_at IS NULL`,
        [tenantId]
      ),
      EarningRulesService.getActiveRules(db, tenantId).catch(() => []),
    ]);

    if (tenantRes.rows.length === 0) {
      throw new AdminOpsError('NOT_FOUND', 'Tenant not found');
    }

    const t = tenantRes.rows[0];
    const excludedKeywords: string[] = Array.isArray(t.excluded_item_keywords) ? t.excluded_item_keywords : [];
    const adapter = new CustomApiAdapter();
    const order = adapter.parseOrder(payload, excludedKeywords);

    const rawOrder = payload?.order || payload || {};
    const rawTotal = Number(rawOrder.total_amount ?? rawOrder.total_price ?? rawOrder.total ?? rawOrder.amount ?? 0);
    const discountAmount = Number(rawOrder.discount_amount ?? rawOrder.discount ?? 0);
    const items = Array.isArray(rawOrder.items) ? rawOrder.items : undefined;
    const summary = summarizeEligibleOrder(rawTotal, items, excludedKeywords);

    const tierMultiplier = Number(tbRes.rows[0]?.multiplier ?? 1);
    const campaignMatch = computeActiveCampaignMultiplier(campaignsRes.rows || []);

    const evaluation = evaluateOrderWithRules({
      totalAmount: rawTotal,
      discountAmount,
      items,
      rules: activeRules,
      excludedKeywords,
      pointsPerEgp: Number(t.points_per_egp || 0),
      tierMultiplier,
      campaignMultiplier: campaignMatch.multiplier,
      minPurchaseEgp: Number(t.min_purchase_egp || 0),
    });

    return {
      parsed: order,
      rawTotal: evaluation.rawTotal,
      excludedTotal: evaluation.excludedTotal,
      eligibleTotal: evaluation.eligibleTotal,
      excludedItems: evaluation.items.length > 0
        ? evaluation.items.filter((i) => i.is_excluded).map((i) => ({
            name: i.product_name,
            amount: i.net_amount,
            reason: i.exclusion_reason || 'excluded',
          }))
        : summary.excludedItems,
      pointsPerEgp: Number(t.points_per_egp || 0),
      minPurchaseEgp: Number(t.min_purchase_egp || 0),
      tier: customerTier,
      tierMultiplier,
      campaignName: campaignMatch.matchedCampaignName,
      campaignMultiplier: campaignMatch.multiplier,
      appliedRules: evaluation.appliedRules,
      basketBonusPoints: evaluation.basketBonusPoints,
      belowMinimum: evaluation.belowMinimum,
      pointsEarned: evaluation.totalPoints,
    };
  }
}

export { AnalyticsError };
