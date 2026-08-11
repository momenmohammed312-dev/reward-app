import { PoolClient } from 'pg';

export interface LedgerEntry {
  tenantId: string;
  customerId: string;
  type: 'earned' | 'redeemed' | 'bonus' | 'refund' | 'expired' | 'adjustment' | 'reversal';
  points: number;
  referenceId?: string | null;
  referenceType?: string | null;
  note?: string | null;
  createdBy?: string;
  idempotencyKey?: string | null;
}

/**
 * Single write-path for wallet_ledger. Every insert carries an optional
 * idempotency_key guarded by a partial unique index, so retried jobs can never
 * double-post points. All writes must happen inside the caller's transaction
 * (the caller owns BEGIN/COMMIT/ROLLBACK and connection release).
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
    } = entry;

    return client.query(
      `INSERT INTO wallet_ledger
         (tenant_id, customer_id, type, points, reference_id, reference_type, note, created_by, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING`,
      [
        tenantId,
        customerId,
        type,
        points,
        referenceId || null,
        referenceType || null,
        note || null,
        createdBy || 'system',
        idempotencyKey || null,
      ]
    );
  }
}
