import { PoolClient } from 'pg';
import db from '../config/db.js';
import { EarningRule, EarningRuleType } from '../helpers/rulesEngine.js';

export class EarningRuleError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'VALIDATION',
    message: string
  ) {
    super(message);
    this.name = 'EarningRuleError';
  }
}

export interface EarningRulePayload {
  name?: string;
  rule_type?: EarningRuleType;
  target_value?: string | null;
  multiplier?: number | null;
  min_basket_egp?: number | null;
  bonus_points?: number | null;
  priority?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
}

export class EarningRulesService {
  /**
   * Lists all non-deleted earning rules for a tenant ordered by priority.
   */
  static async list(tenantId: string) {
    const res = await db.query(
      `SELECT id, tenant_id, name, rule_type, target_value,
              multiplier::float8 AS multiplier,
              min_basket_egp::float8 AS min_basket_egp,
              bonus_points, priority, starts_at, ends_at, is_active, created_at, updated_at
       FROM earning_rules
       WHERE tenant_id = $1::uuid AND deleted_at IS NULL
       ORDER BY priority ASC, created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  /**
   * Loads active earning rules inside a transaction (or standalone pool query).
   */
  static async getActiveRules(clientOrDb: PoolClient | typeof db, tenantId: string): Promise<EarningRule[]> {
    const res = await clientOrDb.query(
      `SELECT id, name, rule_type, target_value,
              multiplier::float8 AS multiplier,
              min_basket_egp::float8 AS min_basket_egp,
              bonus_points, priority, starts_at, ends_at, is_active
       FROM earning_rules
       WHERE tenant_id = $1::uuid AND is_active = true AND deleted_at IS NULL
       ORDER BY priority ASC`,
      [tenantId]
    );
    return (res?.rows || []) as EarningRule[];
  }

  /**
   * Creates a tenant-scoped earning rule.
   */
  static async create(tenantId: string, data: EarningRulePayload) {
    const res = await db.query(
      `INSERT INTO earning_rules
         (tenant_id, name, rule_type, target_value, multiplier, min_basket_egp, bonus_points, priority, starts_at, ends_at, is_active)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11)
       RETURNING id, tenant_id, name, rule_type, target_value,
                 multiplier::float8 AS multiplier,
                 min_basket_egp::float8 AS min_basket_egp,
                 bonus_points, priority, starts_at, ends_at, is_active, created_at, updated_at`,
      [
        tenantId,
        data.name!.trim(),
        data.rule_type!,
        data.target_value?.trim() || null,
        data.multiplier ?? null,
        data.min_basket_egp ?? null,
        data.bonus_points ?? null,
        data.priority ?? 100,
        data.starts_at || null,
        data.ends_at || null,
        data.is_active ?? true,
      ]
    );
    return res.rows[0];
  }

  /**
   * Updates an existing tenant-owned earning rule.
   */
  static async update(tenantId: string, ruleId: string, data: EarningRulePayload) {
    const hasTarget = Object.prototype.hasOwnProperty.call(data, 'target_value');
    const hasMult = Object.prototype.hasOwnProperty.call(data, 'multiplier');
    const hasMinBasket = Object.prototype.hasOwnProperty.call(data, 'min_basket_egp');
    const hasBonus = Object.prototype.hasOwnProperty.call(data, 'bonus_points');
    const hasStarts = Object.prototype.hasOwnProperty.call(data, 'starts_at');
    const hasEnds = Object.prototype.hasOwnProperty.call(data, 'ends_at');

    const res = await db.query(
      `UPDATE earning_rules
       SET name = COALESCE($3, name),
           rule_type = COALESCE($4, rule_type),
           target_value = CASE WHEN $5::boolean THEN $6 ELSE target_value END,
           multiplier = CASE WHEN $7::boolean THEN $8::numeric ELSE multiplier END,
           min_basket_egp = CASE WHEN $9::boolean THEN $10::numeric ELSE min_basket_egp END,
           bonus_points = CASE WHEN $11::boolean THEN $12::integer ELSE bonus_points END,
           priority = COALESCE($13, priority),
           starts_at = CASE WHEN $14::boolean THEN $15::timestamptz ELSE starts_at END,
           ends_at = CASE WHEN $16::boolean THEN $17::timestamptz ELSE ends_at END,
           is_active = COALESCE($18, is_active),
           updated_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
       RETURNING id, tenant_id, name, rule_type, target_value,
                 multiplier::float8 AS multiplier,
                 min_basket_egp::float8 AS min_basket_egp,
                 bonus_points, priority, starts_at, ends_at, is_active, created_at, updated_at`,
      [
        ruleId,
        tenantId,
        data.name?.trim() || null,
        data.rule_type || null,
        hasTarget,
        hasTarget ? (data.target_value?.trim() || null) : null,
        hasMult,
        hasMult ? (data.multiplier ?? null) : null,
        hasMinBasket,
        hasMinBasket ? (data.min_basket_egp ?? null) : null,
        hasBonus,
        hasBonus ? (data.bonus_points ?? null) : null,
        data.priority ?? null,
        hasStarts,
        hasStarts ? (data.starts_at || null) : null,
        hasEnds,
        hasEnds ? (data.ends_at || null) : null,
        data.is_active ?? null,
      ]
    );

    if (res.rows.length === 0) {
      throw new EarningRuleError('NOT_FOUND', 'Earning rule not found');
    }
    return res.rows[0];
  }

  /**
   * Soft-deletes a tenant-owned earning rule.
   */
  static async remove(tenantId: string, ruleId: string) {
    const res = await db.query(
      `UPDATE earning_rules
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
       RETURNING id`,
      [ruleId, tenantId]
    );
    if (res.rows.length === 0) {
      throw new EarningRuleError('NOT_FOUND', 'Earning rule not found');
    }
    return { message: 'Earning rule deleted', id: ruleId };
  }
}
