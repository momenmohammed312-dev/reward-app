import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReconciliationService } from '../reconciliation.js';
import { OutboxService } from '../outbox.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');

describe('Phase 3: Operational Readiness Acceptance Tests', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    (db.pool.connect as any) = vi.fn().mockResolvedValue(mockClient);
    (db.query as any) = vi.fn();
  });

  describe('3.6 Reconciliation Job Integrity Checks', () => {
    it('should detect missing ledger records for transactions with earned points', async () => {
      (db.query as any).mockResolvedValue({
        rows: [
          {
            transaction_id: 'tx-001',
            tenant_id: 'tenant-1',
            customer_id: 'cust-1',
            invoice_id: 'inv-100',
            points_earned: 150,
            ledger_id: null,
            ledger_points: null,
          },
          {
            transaction_id: 'tx-002',
            tenant_id: 'tenant-1',
            customer_id: 'cust-2',
            invoice_id: 'inv-200',
            points_earned: 80,
            ledger_id: 'led-002',
            ledger_points: 80,
          },
        ],
      });

      const report = await ReconciliationService.runAudit('tenant-1', 24);

      expect(report.totalTransactionsChecked).toBe(2);
      expect(report.discrepanciesCount).toBe(1);
      expect(report.discrepancies[0].type).toBe('missing_ledger');
      expect(report.discrepancies[0].transactionId).toBe('tx-001');
      expect(report.discrepancies[0].expectedPoints).toBe(150);
    });

    it('should detect points mismatch between transaction and ledger', async () => {
      (db.query as any).mockResolvedValue({
        rows: [
          {
            transaction_id: 'tx-003',
            tenant_id: 'tenant-1',
            customer_id: 'cust-3',
            invoice_id: 'inv-300',
            points_earned: 200,
            ledger_id: 'led-003',
            ledger_points: 100,
          },
        ],
      });

      const report = await ReconciliationService.runAudit('tenant-1', 24);

      expect(report.discrepanciesCount).toBe(1);
      expect(report.discrepancies[0].type).toBe('points_mismatch');
      expect(report.discrepancies[0].expectedPoints).toBe(200);
      expect(report.discrepancies[0].actualPoints).toBe(100);
    });
  });

  describe('3.3 Transactional Outbox Pattern Execution', () => {
    it('should enqueue outbox event within transaction', async () => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 'outbox-ev-1' }] });

      const eventId = await OutboxService.createEvent(mockClient, {
        tenantId: 'tenant-1',
        eventType: 'sms_notification',
        payload: { phone: '+201000000000', message: 'You earned 50 points!' },
      });

      expect(eventId).toBe('outbox-ev-1');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO outbox_events'),
        expect.any(Array)
      );
    });

    it('should process pending outbox events and mark them as processed', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, tenant_id, event_type')) {
          return Promise.resolve({
            rows: [
              {
                id: 'outbox-1',
                tenant_id: 'tenant-1',
                event_type: 'sms_notification',
                payload: { phone: '+201011111111', message: 'Hello' },
                attempts: 0,
                max_attempts: 5,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const processed = await OutboxService.processPendingEvents(10);

      expect(processed).toBe(1);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'processed'"),
        ['outbox-1']
      );
    });
  });
});
