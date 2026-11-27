import { PoolClient } from 'pg';
import db from '../config/db.js';

export type LedgerType =
  | 'earned'
  | 'redeemed'
  | 'bonus'
  | 'refund'
  | 'expired'
  | 'adjustment'
  | 'reversal';

export interface LedgerEntry {
  tenantId: string;
  customerId: string;
  type: LedgerType;
  points: number;
  referenceId?: string | null;
  referenceType?: string | null;
  note?: string | null;
  createdBy?: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
}

const CREDIT_TYPES = new Set<LedgerType>(['earned', 'bonus', 'refund', 'adjustment']);
const EARNED_TYPES = new Set<LedgerType>(['earned', 'bonus']);

/**
 * Single write-path for wallet_ledger. Every insert carries an optional
 * idempotency_key guarded by a partial unique index, so retried jobs can never
 * double-post points. When a row is actually inserted (rowCount > 0), atomically
 * updates O(1) cached counters on customers within the caller's transaction.
 */
export class LedgerService {
  static async insert(client: PoolClient, entry: LedgerEntry) {
    const {
      tenantId,
      customerId,
      type,
      points,
      referenceId,
      referenceType,
      note,
      createdBy,
      idempotencyKey,
      metadata,
    } = entry;

    const absPoints = Math.max(0, Math.floor(Number(points)));

    const res = await client.query(
      `INSERT INTO wallet_ledger
         (tenant_id, customer_id, type, points, reference_id, reference_type, note, created_by, idempotency_key, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
       RETURNING id`,
      [
        tenantId,
        customerId,
        type,
        absPoints,
        referenceId || null,
        referenceType || null,
        note || null,
        createdBy || 'system',
        idempotencyKey || null,
        JSON.stringify(metadata || {}),
      ]
    );

    const insertedCount = res?.rowCount ?? res?.rows?.length ?? 0;
    if (insertedCount > 0 && absPoints > 0) {
      const deltaBalance = CREDIT_TYPES.has(type) ? absPoints : -absPoints;
      const deltaEarned = EARNED_TYPES.has(type) ? absPoints : 0;
      const deltaRedeemed = type === 'redeemed' ? absPoints : 0;

      await client.query(
        `UPDATE customers
         SET cached_balance = COALESCE(cached_balance, 0) + $3,
             cached_total_earned = COALESCE(cached_total_earned, 0) + $4,
             cached_total_redeemed = COALESCE(cached_total_redeemed, 0) + $5,
             total_earned = COALESCE(total_earned, 0) + $4,
             updated_at = NOW()
         WHERE id = $1::uuid AND tenant_id = $2::uuid`,
        [customerId, tenantId, deltaBalance, deltaEarned, deltaRedeemed]
      );
    }

    return res;
  }

  /**
   * Verifies and repairs O(1) cached counters on customers from the immutable
   * customer_balances ledger aggregate view if any drift occurred.
   */
  static async reconcileCustomerBalance(tenantId: string, customerId: string) {
    const res = await db.query(
      `SELECT
         COALESCE(cb.current_balance, 0)::int AS ledger_balance,
         COALESCE(cb.total_earned, 0)::int AS ledger_earned,
         COALESCE(cb.total_redeemed, 0)::int AS ledger_redeemed,
         c.cached_balance::int AS cached_balance
       FROM customers c
       LEFT JOIN customer_balances cb ON c.id = cb.customer_id AND cb.tenant_id = c.tenant_id
       WHERE c.id = $1::uuid AND c.tenant_id = $2::uuid AND c.deleted_at IS NULL`,
      [customerId, tenantId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const drifted = Number(row.ledger_balance) !== Number(row.cached_balance);
    if (drifted) {
      await db.query(
        `UPDATE customers
         SET cached_balance = $3,
             cached_total_earned = $4,
             cached_total_redeemed = $5,
             total_earned = $4,
             updated_at = NOW()
         WHERE id = $1::uuid AND tenant_id = $2::uuid`,
        [customerId, tenantId, row.ledger_balance, row.ledger_earned, row.ledger_redeemed]
      );
    }

    return {
      customerId,
      drifted,
      balance: Number(row.ledger_balance),
      totalEarned: Number(row.ledger_earned),
      totalRedeemed: Number(row.ledger_redeemed),
    };
  }
}
