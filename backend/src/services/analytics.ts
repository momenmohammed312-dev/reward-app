import db from '../config/db.js';
import { isUuid } from '../helpers/resolveTenant.js';

export class AnalyticsError extends Error {
  code: 'BRANCH_NOT_FOUND';

  constructor(code: 'BRANCH_NOT_FOUND', message: string) {
    super(message);
    this.name = 'AnalyticsError';
    this.code = code;
  }
}

export interface BranchInfo {
  id: string;
  name: string;
  timezone: string;
}

export interface RetentionAnalytics {
  branchId: string | null;
  timezone: string;
  repeatVisitRate: {
    totalActiveCustomers: number;
    repeatCustomers: number;
    ratePercent: number;
    avgVisitsPerCustomer: number;
  };
  busiestHours: Array<{
    hour: number;
    label: string;
    ordersCount: number;
    pointsAwarded: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    phone: string;
    tier: string;
    visitsCount: number;
    totalSpent: number;
    pointsBalance: number;
    lastVisit: string | null;
  }>;
  rewardPerformance: Array<{
    id: string;
    title: string;
    category: string;
    requiredPoints: number;
    totalRedemptions: number;
    usedRedemptions: number;
    conversionRate: number;
  }>;
}

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'م' : 'ص';
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(normalized).padStart(2, '0')}:00 ${period}`;
}

export class AnalyticsService {
  /**
   * Verifies that a branch belongs to the authenticated tenant and is active (not soft-deleted).
   */
  static async verifyBranchOwnership(tenantId: string, branchId: string): Promise<BranchInfo> {
    if (!branchId || !isUuid(branchId)) {
      throw new AnalyticsError('BRANCH_NOT_FOUND', 'Branch not found for this tenant');
    }

    const result = await db.query(
      `SELECT id, name, COALESCE(timezone, 'Africa/Cairo') AS timezone
       FROM branches
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL`,
      [branchId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new AnalyticsError('BRANCH_NOT_FOUND', 'Branch not found for this tenant');
    }

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
      timezone: result.rows[0].timezone || 'Africa/Cairo',
    };
  }

  /**
   * Computes retention metrics, hourly peak activity, top 10 customers,
   * and reward conversion performance, optionally filtered by branch.
   */
  static async getRetentionAnalytics(tenantId: string, branchId?: string): Promise<RetentionAnalytics> {
    let timezone = 'Africa/Cairo';
    let verifiedBranchId: string | null = null;

    if (branchId) {
      const branch = await this.verifyBranchOwnership(tenantId, branchId);
      verifiedBranchId = branch.id;
      timezone = branch.timezone;
    }

    const txBranchFilter = verifiedBranchId ? 'AND branch_id = $2::uuid' : '';
    const txParams = verifiedBranchId ? [tenantId, verifiedBranchId] : [tenantId];

    const hoursBranchFilter = verifiedBranchId ? 'AND branch_id = $3::uuid' : '';
    const hoursParams = verifiedBranchId ? [tenantId, timezone, verifiedBranchId] : [tenantId, timezone];

    const txJoinBranchFilter = verifiedBranchId ? 'AND t.branch_id = $2::uuid' : '';
    const rdJoinBranchFilter = verifiedBranchId ? 'AND rd.branch_id = $2::uuid' : '';

    const [repeatRes, hoursRes, topCustomersRes, rewardPerfRes] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*)::int AS total_active_customers,
           COUNT(*) FILTER (WHERE tx_count >= 2)::int AS repeat_customers,
           COALESCE(ROUND(AVG(tx_count)::numeric, 2), 0) AS avg_visits
         FROM (
           SELECT customer_id, COUNT(*)::int AS tx_count
           FROM transactions
           WHERE tenant_id = $1::uuid ${txBranchFilter}
           GROUP BY customer_id
         ) sub`,
        txParams
      ),
      db.query(
        `SELECT
           EXTRACT(HOUR FROM created_at AT TIME ZONE $2)::int AS hour,
           COUNT(*)::int AS orders_count,
           COALESCE(SUM(points_earned), 0)::int AS points_awarded
         FROM transactions
         WHERE tenant_id = $1::uuid ${hoursBranchFilter}
         GROUP BY hour
         ORDER BY hour ASC`,
        hoursParams
      ),
      db.query(
        `SELECT
           c.id,
           c.name,
           c.phone,
           c.tier,
           COUNT(t.id)::int AS visits_count,
           COALESCE(SUM(t.amount), 0)::numeric AS total_spent,
           COALESCE(cb.current_balance, 0)::int AS points_balance,
           c.last_visit
         FROM customers c
         LEFT JOIN transactions t
           ON t.customer_id = c.id AND t.tenant_id = c.tenant_id ${txJoinBranchFilter}
         LEFT JOIN customer_balances cb
           ON cb.customer_id = c.id AND cb.tenant_id = c.tenant_id
         WHERE c.tenant_id = $1::uuid AND c.deleted_at IS NULL
         GROUP BY c.id, c.name, c.phone, c.tier, cb.current_balance, c.last_visit
         ORDER BY visits_count DESC, total_spent DESC
         LIMIT 10`,
        txParams
      ),
      db.query(
        `SELECT
           rw.id,
           rw.name AS title,
           COALESCE(rw.category, 'عام') AS category,
           rw.required_points,
           COUNT(rd.id)::int AS total_redemptions,
           COUNT(rd.id) FILTER (WHERE rd.used_at IS NOT NULL)::int AS used_redemptions
         FROM rewards rw
         LEFT JOIN redemptions rd
           ON rd.reward_id = rw.id AND rd.tenant_id = rw.tenant_id ${rdJoinBranchFilter}
         WHERE rw.tenant_id = $1::uuid AND rw.deleted_at IS NULL
         GROUP BY rw.id, rw.name, rw.category, rw.required_points
         ORDER BY total_redemptions DESC, rw.required_points ASC`,
        txParams
      ),
    ]);

    const repeatRow = repeatRes.rows[0] || {};
    const totalActiveCustomers = Number(repeatRow.total_active_customers || 0);
    const repeatCustomers = Number(repeatRow.repeat_customers || 0);
    const avgVisitsPerCustomer = Number(repeatRow.avg_visits || 0);
    const ratePercent =
      totalActiveCustomers > 0
        ? Math.round((repeatCustomers / totalActiveCustomers) * 1000) / 10
        : 0;

    return {
      branchId: verifiedBranchId,
      timezone,
      repeatVisitRate: {
        totalActiveCustomers,
        repeatCustomers,
        ratePercent,
        avgVisitsPerCustomer,
      },
      busiestHours: hoursRes.rows.map((r) => {
        const hour = Number(r.hour);
        return {
          hour,
          label: formatHourLabel(hour),
          ordersCount: Number(r.orders_count || 0),
          pointsAwarded: Number(r.points_awarded || 0),
        };
      }),
      topCustomers: topCustomersRes.rows.map((r) => ({
        id: r.id,
        name: r.name || 'عميل',
        phone: r.phone,
        tier: r.tier || 'bronze',
        visitsCount: Number(r.visits_count || 0),
        totalSpent: Number(r.total_spent || 0),
        pointsBalance: Number(r.points_balance || 0),
        lastVisit: r.last_visit || null,
      })),
      rewardPerformance: rewardPerfRes.rows.map((r) => {
        const totalRedemptions = Number(r.total_redemptions || 0);
        const usedRedemptions = Number(r.used_redemptions || 0);
        return {
          id: r.id,
          title: r.title,
          category: r.category || 'عام',
          requiredPoints: Number(r.required_points || 0),
          totalRedemptions,
          usedRedemptions,
          conversionRate:
            totalRedemptions > 0
              ? Math.round((usedRedemptions / totalRedemptions) * 1000) / 10
              : 0,
        };
      }),
    };
  }
}
