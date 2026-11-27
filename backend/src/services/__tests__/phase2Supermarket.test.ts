import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAdapter, UnsupportedPosAdapterError } from '../pos/adapterRegistry.js';
import { computeExpiringSoonPoints, ExpiryService } from '../expiry.js';
import { LedgerService } from '../ledger.js';
import { LoyaltyService } from '../loyalty.js';
import { PosApiService } from '../posApi.js';
import { LoyaltyController } from '../../controllers/loyaltyController.js';
import { AdminOpsService } from '../adminOps.js';
import * as otpModule from '../otp.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');

describe('Phase 2 Supermarket Engine & Architecture Tests', () => {
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

  describe('1. Fail-closed POS adapterRegistry', () => {
    it('throws UnsupportedPosAdapterError on unknown or empty posType instead of failing open to Foodics', () => {
      expect(() => getAdapter('unknown_erp')).toThrow(UnsupportedPosAdapterError);
      expect(() => getAdapter('')).toThrow(UnsupportedPosAdapterError);
      expect(() => getAdapter(undefined)).toThrow(UnsupportedPosAdapterError);
      expect(getAdapter('foodics').posType).toBe('foodics');
      expect(getAdapter('custom_api').posType).toBe('custom_api');
    });
  });

  describe('2. LedgerService O(1) atomic cache updates & idempotency guard', () => {
    it('increments cached_balance once when rowCount > 0 and skips update when idempotent conflict returns rowCount = 0', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'led-1' }] });
      mockClient.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

      await LedgerService.insert(mockClient, {
        tenantId: 'tenant-1',
        customerId: 'cust-1',
        type: 'earned',
        points: 120,
        idempotencyKey: 'earn:tenant-1:INV-1',
      });

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('cached_balance = COALESCE(cached_balance, 0) + $3'),
        ['cust-1', 'tenant-1', 120, 120, 0]
      );

      vi.clearAllMocks();
      // Duplicate conflict -> rowCount = 0 -> NO second UPDATE on customers!
      mockClient.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
      await LedgerService.insert(mockClient, {
        tenantId: 'tenant-1',
        customerId: 'cust-1',
        type: 'earned',
        points: 120,
        idempotencyKey: 'earn:tenant-1:INV-1',
      });

      expect(mockClient.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Refund shortfall policy & item-level refunds', () => {
    it('caps reversal at 0 and records shortfall_points when refund_policy = cap_zero', async () => {
      vi.spyOn(LoyaltyService, 'getCustomerPointsSummary').mockResolvedValueOnce({
        id: 'cust-1',
        points_balance: 0,
      } as any);

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM transactions')) {
          return Promise.resolve({
            rows: [{ id: 'tx-1', customer_id: 'cust-1', amount: 500, points_earned: 100 }],
          });
        }
        if (sql.includes('refund_policy')) {
          return Promise.resolve({
            rows: [{ cached_balance: 30, refund_policy: 'cap_zero' }],
          });
        }
        if (sql.includes('INSERT INTO wallet_ledger')) {
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'led-rev' }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await LoyaltyService.refundPoints('tenant-1', 'INV-CAP', 'Returned all');
      expect((res as any).reversed_points).toBe(30);
      expect((res as any).shortfall_points).toBe(70);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO wallet_ledger'),
        expect.arrayContaining([
          30,
          expect.stringContaining('"shortfall_points":70'),
        ])
      );
    });

    it('rejects refund when balance < clawback points and refund_policy = reject', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM transactions')) {
          return Promise.resolve({
            rows: [{ id: 'tx-1', customer_id: 'cust-1', amount: 500, points_earned: 100 }],
          });
        }
        if (sql.includes('refund_policy')) {
          return Promise.resolve({
            rows: [{ cached_balance: 20, refund_policy: 'reject' }],
          });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      await expect(
        LoyaltyService.refundPoints('tenant-1', 'INV-REJ')
      ).rejects.toThrow('Insufficient points balance to reverse refund');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('supports item-level partial refunds and updates transaction_items refunded counters', async () => {
      vi.spyOn(LoyaltyService, 'getCustomerPointsSummary').mockResolvedValueOnce({
        id: 'cust-1',
        points_balance: 80,
      } as any);

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM transactions')) {
          return Promise.resolve({
            rows: [{ id: 'tx-1', customer_id: 'cust-1', amount: 300, points_earned: 100 }],
          });
        }
        if (sql.includes('refund_policy')) {
          return Promise.resolve({
            rows: [{ cached_balance: 100, refund_policy: 'cap_zero' }],
          });
        }
        if (sql.includes('COALESCE(SUM(points), 0)')) {
          return Promise.resolve({ rows: [{ reversed_points: 0 }] });
        }
        if (sql.includes('FROM transaction_items')) {
          return Promise.resolve({
            rows: [
              {
                id: 'item-1',
                quantity: 2,
                net_amount: 100,
                points_earned: 40,
                refunded_quantity: 0,
                refunded_points: 0,
              },
            ],
          });
        }
        if (sql.includes('INSERT INTO wallet_ledger')) {
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'led-item-rev' }] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      const res = await LoyaltyService.refundPoints('tenant-1', 'INV-ITEMS', 'Returned 1 unit', undefined, [
        { transaction_item_id: 'item-1', quantity: 1 },
      ]);

      expect((res as any).reversed_points).toBe(20);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE transaction_items'),
        ['item-1', 1, 20]
      );
    });
  });

  describe('4. Synchronous POS API & tenant isolation', () => {
    it('returns 404 POS_NOT_FOUND when customer identifier belongs to another tenant', async () => {
      (db.query as any).mockResolvedValueOnce({ rows: [] });
      await expect(PosApiService.getCustomer('tenant-A', 'MKT-99999999')).rejects.toThrow(
        'Customer not found for this store'
      );
    });

    it('returns synchronous customer balance and eligible rewards for matching card_number', async () => {
      vi.spyOn(LoyaltyService, 'lookupCustomerByIdentifier').mockResolvedValueOnce({
        id: 'cust-1',
        card_number: 'MKT-11223344',
        phone: '01012345678',
        name: 'سارة',
        tier: 'gold',
        points_balance: 300,
        wallet_value_egp: 15,
        total_spent_egp: 3000,
        is_verified: true,
      } as any);
      (db.query as any).mockResolvedValueOnce({
        rows: [
          { id: 'rw-1', title: 'خصم 20 ج.م', required_points: 200, reward_type: 'discount_fixed', discount_value: 20, min_order_egp: 100 },
          { id: 'rw-2', title: 'خصم 50 ج.م', required_points: 500, reward_type: 'discount_fixed', discount_value: 50, min_order_egp: 200 },
        ],
      });

      const data = await PosApiService.getCustomer('tenant-A', 'MKT-11223344');
      expect(data.customer.card_number).toBe('MKT-11223344');
      expect(data.rewards[0].eligible).toBe(true);
      expect(data.rewards[1].eligible).toBe(false);
    });
  });

  describe('5. Cashier daily manual points limit', () => {
    it('blocks cashier exceeding cashier_daily_manual_limit with 403 while permitting within cap', async () => {
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('cashier_daily_manual_limit')) {
          return Promise.resolve({ rows: [{ cashier_daily_manual_limit: 200 }] });
        }
        if (sql.includes('AS granted_today')) {
          return Promise.resolve({ rows: [{ granted_today: 180 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await LoyaltyController.adminEarnPointsManual(
        {
          user: { id: 'cashier-1', tenant_id: 'tenant-1', role: 'cashier' },
          body: { customer_identifier: 'MKT-12345678', points: 50 },
        } as any,
        res
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('5b. Bug-hunt regressions: zero-balance cap_zero & atomic idempotent POS redeem', () => {
    it('records a 0-point reversal row with shortfall_points when balance is 0 under cap_zero', async () => {
      vi.spyOn(LoyaltyService, 'getCustomerPointsSummary').mockResolvedValueOnce({
        id: 'cust-1',
        points_balance: 0,
      } as any);

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM transactions')) {
          return Promise.resolve({
            rows: [{ id: 'tx-zero-1', customer_id: 'cust-1', amount: 500, points_earned: 100 }],
          });
        }
        if (sql.includes('refund_policy')) {
          return Promise.resolve({
            rows: [{ cached_balance: 0, refund_policy: 'cap_zero' }],
          });
        }
        if (sql.includes('INSERT INTO wallet_ledger')) {
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'led-zero-rev' }] });
        }
        return Promise.resolve({ rowCount: 0, rows: [] });
      });

      const res = await LoyaltyService.refundPoints('tenant-1', 'INV-ZERO-CAP', 'Zero balance return');
      expect((res as any).reversed_points).toBe(0);
      expect((res as any).shortfall_points).toBe(100);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO wallet_ledger'),
        expect.arrayContaining([
          0,
          'reversal:tenant-1:INV-ZERO-CAP',
          expect.stringContaining('"shortfall_points":100'),
        ])
      );
    });

    it('returns existing redemption idempotently without deducting points twice when idempotencyKey already exists', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM wallet_ledger wl') && sql.includes('idempotency_key')) {
          return Promise.resolve({
            rows: [
              {
                id: 'red-existing-1',
                code: 'MKT-555666',
                expires_at: new Date('2026-12-01T00:00:00Z'),
                points_used: 200,
                points_balance: 300,
              },
            ],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await LoyaltyService.redeemReward('tenant-1', 'cust-1', 'rw-1', 'branch-1', {
        markUsedImmediately: true,
        idempotencyKey: 'pos_redeem:tenant-1:k-123',
      });

      expect((res as any).duplicate).toBe(true);
      expect(res.code).toBe('MKT-555666');
      expect(res.remainingBalance).toBe(300);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.query).not.toHaveBeenCalledWith(expect.stringContaining('UPDATE rewards'), expect.anything());
    });
  });

  describe('6. Pre-expiry FIFO warnings & idempotent SMS dispatch', () => {
    it('identifies active credits expiring within warnDaysBefore', () => {
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const now = new Date('2026-06-01T00:00:00Z').getTime();
      const soon = computeExpiringSoonPoints(
        [
          { id: 'l-1', type: 'earned', points: 100, created_at: new Date(now - 25 * MS_PER_DAY).toISOString() },
          { id: 'l-2', type: 'earned', points: 80, created_at: new Date(now - 10 * MS_PER_DAY).toISOString() },
        ],
        30,
        7,
        now
      );

      expect(soon).toHaveLength(1);
      expect(soon[0].ledgerId).toBe('l-1');
      expect(soon[0].points).toBe(100);
    });

    it('skips duplicate SMS when expiry_notifications_log ON CONFLICT DO NOTHING returns 0 rows', async () => {
      const smsSpy = vi.spyOn(otpModule, 'sendSmsMessage').mockResolvedValue();
      const oldDate = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString();

      (db.query as any).mockImplementation((sql: string) => {
        if (sql.includes('FROM tenants')) {
          return Promise.resolve({
            rows: [{ id: 'tenant-1', name: 'ماركت النور', points_expiry_days: 30, warn_days: 7 }],
          });
        }
        if (sql.includes('FROM customers c')) {
          return Promise.resolve({ rows: [{ id: 'cust-1', phone: '01012345678', name: 'أحمد' }] });
        }
        if (sql.includes('FROM wallet_ledger')) {
          return Promise.resolve({
            rows: [{ id: 'led-exp-1', type: 'earned', points: 150, created_at: oldDate }],
          });
        }
        if (sql.includes('INSERT INTO expiry_notifications_log')) {
          // Simulate already logged -> 0 rows returned
          return Promise.resolve({ rowCount: 0, rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const sent = await ExpiryService.sendExpiryWarnings();
      expect(sent).toBe(0);
      expect(smsSpy).not.toHaveBeenCalled();
    });
  });

  describe('7. AdminOpsService.createCustomer', () => {
    it('creates a customer and posts initial_points through LedgerService.insert', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM customers')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO customers')) {
          return Promise.resolve({
            rows: [
              {
                id: 'cust-new-1',
                name: 'عميل ديمو',
                phone: '01099887755',
                card_number: 'MKT-12345678',
                tier: 'bronze',
                is_verified: true,
              },
            ],
          });
        }
        if (sql.includes('INSERT INTO wallet_ledger')) {
          return Promise.resolve({ rowCount: 1, rows: [{ id: 'led-init-1' }] });
        }
        return Promise.resolve({ rowCount: 1, rows: [] });
      });

      const created = await AdminOpsService.createCustomer('tenant-1', 'admin-1', {
        name: 'عميل ديمو',
        phone: '01099887755',
        tier: 'bronze',
        initial_points: 150,
        is_verified: true,
      });

      expect(created.card_number).toBe('MKT-12345678');
      expect(created.balance).toBe(150);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO wallet_ledger'),
        expect.arrayContaining(['tenant-1', 'cust-new-1', 'bonus', 150])
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('throws CONFLICT when active customer phone already exists for the tenant', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM customers')) {
          return Promise.resolve({ rows: [{ id: 'existing-cust' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        AdminOpsService.createCustomer('tenant-1', 'admin-1', {
          name: 'عميل مكرر',
          phone: '01099887755',
        })
      ).rejects.toThrow('يوجد عميل مسجل بهذا الرقم بالفعل');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });
});
