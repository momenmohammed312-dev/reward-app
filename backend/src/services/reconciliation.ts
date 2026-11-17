import db from '../config/db.js';
import { logger } from './logger.js';

export interface ReconciliationReport {
  timestamp: string;
  tenantId?: string;
  totalTransactionsChecked: number;
  totalLedgerEntriesChecked: number;
  discrepanciesCount: number;
  discrepancies: Array<{
    type: 'missing_ledger' | 'points_mismatch' | 'orphan_ledger';
    transactionId?: string;
    ledgerId?: string;
    customerId: string;
    expectedPoints: number;
    actualPoints: number;
    details: string;
  }>;
}

export class ReconciliationService {
  /**
   * Runs financial integrity audit comparing transactions vs. wallet_ledger.
   */
  static async runAudit(tenantId?: string, lookbackHours = 24): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      tenantId,
      totalTransactionsChecked: 0,
      totalLedgerEntriesChecked: 0,
      discrepanciesCount: 0,
      discrepancies: [],
    };

    try {
      const tenantFilter = tenantId ? `AND t.tenant_id = $2::uuid` : '';
      const params: unknown[] = [lookbackHours];
      if (tenantId) params.push(tenantId);

      const txQuery = `
        SELECT
          t.id as transaction_id,
          t.tenant_id,
          t.customer_id,
          t.invoice_id,
          t.points_earned,
          l.id as ledger_id,
          l.points as ledger_points
        FROM transactions t
        LEFT JOIN wallet_ledger l ON t.id = l.reference_id AND l.type = 'earned'
        WHERE t.created_at >= NOW() - ($1 || ' hours')::INTERVAL
        ${tenantFilter}
      `;

      const txRes = await db.query(txQuery, params);
      report.totalTransactionsChecked = txRes.rows.length;

      for (const row of txRes.rows) {
        if (row.points_earned > 0 && !row.ledger_id) {
          report.discrepancies.push({
            type: 'missing_ledger',
            transactionId: row.transaction_id,
            customerId: row.customer_id,
            expectedPoints: row.points_earned,
            actualPoints: 0,
            details: `Transaction ${row.transaction_id} (Invoice ${row.invoice_id}) has ${row.points_earned} points earned but no ledger row exists.`,
          });
        } else if (row.ledger_id && row.points_earned !== row.ledger_points) {
          report.discrepancies.push({
            type: 'points_mismatch',
            transactionId: row.transaction_id,
            ledgerId: row.ledger_id,
            customerId: row.customer_id,
            expectedPoints: row.points_earned,
            actualPoints: row.ledger_points,
            details: `Points mismatch for transaction ${row.transaction_id}: transaction recorded ${row.points_earned}, ledger recorded ${row.ledger_points}.`,
          });
        }
      }

      report.discrepanciesCount = report.discrepancies.length;

      if (report.discrepanciesCount > 0) {
        logger.warn(`[RECONCILIATION] Discrepancies detected: ${report.discrepanciesCount}`, { report });
      } else {
        logger.info(`[RECONCILIATION] Audit passed cleanly with 0 discrepancies across ${report.totalTransactionsChecked} transactions.`);
      }

      return report;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Reconciliation run failed:', { error: msg });
      throw error;
    }
  }
}
