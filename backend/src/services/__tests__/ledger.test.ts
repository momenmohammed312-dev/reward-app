import { describe, it, expect, vi } from 'vitest';
import { LedgerService } from '../ledger.js';

describe('LedgerService', () => {
  it('should insert into wallet_ledger with partial unique idempotency guard and explicit fields', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
    };

    await LedgerService.insert(mockClient as any, {
      tenantId: 'tenant-1',
      customerId: 'cust-1',
      type: 'earned',
      points: 75,
      referenceId: 'tx-1',
      referenceType: 'transaction',
      note: 'Order #101',
      createdBy: 'webhook',
      idempotencyKey: 'earn:tenant-1:101',
    });

    expect(mockClient.query).toHaveBeenCalledTimes(2);
    const [sql, params] = mockClient.query.mock.calls[0];
    expect(sql).toContain('INSERT INTO wallet_ledger');
    expect(sql).toContain('ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING');
    expect(params).toEqual([
      'tenant-1',
      'cust-1',
      'earned',
      75,
      'tx-1',
      'transaction',
      'Order #101',
      'webhook',
      'earn:tenant-1:101',
      '{}',
    ]);
    expect(mockClient.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE customers'),
      ['cust-1', 'tenant-1', 75, 75, 0]
    );
  });

  it('should default optional fields to null and createdBy to system', async () => {
    const mockClient = {
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [] }),
    };

    await LedgerService.insert(mockClient as any, {
      tenantId: 'tenant-1',
      customerId: 'cust-1',
      type: 'bonus',
      points: 20,
    });

    const [, params] = mockClient.query.mock.calls[0];
    expect(params).toEqual([
      'tenant-1',
      'cust-1',
      'bonus',
      20,
      null,
      null,
      null,
      'system',
      null,
      '{}',
    ]);
  });
});
