import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoyaltyService } from '../loyalty.js';
import db from '../../config/db.js';
import { LedgerService } from '../ledger.js';

vi.mock('../../config/db.js');
vi.mock('../ledger.js');

describe('LoyaltyService — Acceptance & Regression Tests', () => {
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

  describe('1.0 getCustomerPointsSummary', () => {
    it('should scope query by tenant_id when tenantId is provided', async () => {
      (db.query as any).mockResolvedValue({
        rows: [{ id: 'cust-1', tenant_id: 'tenant-1', points_balance: 250 }],
      });

      const summary = await LoyaltyService.getCustomerPointsSummary('cust-1', 'tenant-1');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND tenant_id = $2::uuid'),
        ['cust-1', 'tenant-1']
      );
      expect(summary.points_balance).toBe(250);
    });

    it('should throw Customer not found when customer belongs to another tenant', async () => {
      (db.query as any).mockResolvedValue({ rows: [] });

      await expect(
        LoyaltyService.getCustomerPointsSummary('cust-1', 'foreign-tenant')
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('1.1 Refund Ledger Sign & Reversal Logic', () => {
    it('should claw back points using "reversal" type on refund, leaving balance at 0', async () => {
      const tenantId = 'tenant-123';
      const invoiceId = 'inv-999';
      const customerId = 'cust-456';
      const pointsEarned = 100;
      const transactionId = 'tx-789';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, customer_id, points_earned FROM transactions')) {
          return Promise.resolve({
            rows: [{ id: transactionId, customer_id: customerId, points_earned: pointsEarned }],
          });
        }
        if (sql.includes('SELECT id FROM wallet_ledger') && sql.includes("type = 'reversal'")) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ id: 'ledger-rev-1' });

      (db.query as any).mockResolvedValue({
        rows: [
          {
            id: customerId,
            tenant_id: tenantId,
            phone: '+201000000000',
            points_balance: 0,
            total_earned: 100,
            total_redeemed: 0,
          },
        ],
      });

      const summary = await LoyaltyService.refundPoints(tenantId, invoiceId);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');

      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          tenantId,
          customerId,
          type: 'reversal',
          points: pointsEarned,
          referenceId: transactionId,
          idempotencyKey: `reversal:${tenantId}:${invoiceId}`,
        })
      );

      expect(summary.points_balance).toBe(0);
    });

    it('should throw an error on repeated refund for the same invoice', async () => {
      const tenantId = 'tenant-123';
      const invoiceId = 'inv-999';
      const customerId = 'cust-456';
      const transactionId = 'tx-789';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, customer_id, points_earned FROM transactions')) {
          return Promise.resolve({
            rows: [{ id: transactionId, customer_id: customerId, points_earned: 100 }],
          });
        }
        if (sql.includes('SELECT id FROM wallet_ledger') && sql.includes("type = 'reversal'")) {
          return Promise.resolve({ rows: [{ id: 'existing-reversal' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.refundPoints(tenantId, invoiceId)
      ).rejects.toThrow('Transaction has already been refunded');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('1.2 earnPoints Calculation & Idempotency', () => {
    it('should award tier-multiplied points via LedgerService.insert and update last_visit', async () => {
      const tenantId = 'tenant-123';
      const customerId = 'cust-1';
      const branchId = 'branch-1';
      const invoiceId = 'inv-500';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT points_per_egp, min_purchase_egp FROM tenants')) {
          return Promise.resolve({ rows: [{ points_per_egp: '1', min_purchase_egp: '20' }] });
        }
        if (sql.includes('SELECT tier FROM customers')) {
          return Promise.resolve({ rows: [{ tier: 'gold' }] });
        }
        if (sql.includes('SELECT multiplier FROM tier_benefits')) {
          return Promise.resolve({ rows: [{ multiplier: '1.5' }] });
        }
        if (sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rows: [{ id: 'tx-500' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ rows: [] });
      (db.query as any).mockResolvedValue({
        rows: [{ id: customerId, tenant_id: tenantId, points_balance: 150 }],
      });

      const summary = await LoyaltyService.earnPoints(tenantId, customerId, branchId, invoiceId, 100);

      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          tenantId,
          customerId,
          type: 'earned',
          points: 150,
          referenceId: 'tx-500',
          referenceType: 'transaction',
          idempotencyKey: `earn:${tenantId}:${invoiceId}`,
        })
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE customers SET last_visit = NOW() WHERE id = $1 AND tenant_id = $2',
        [customerId, tenantId]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(summary.points_balance).toBe(150);
    });

    it('should reject and rollback when amount is below min_purchase_egp threshold', async () => {
      const tenantId = 'tenant-123';
      const customerId = 'cust-1';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT points_per_egp, min_purchase_egp FROM tenants')) {
          return Promise.resolve({ rows: [{ points_per_egp: '1', min_purchase_egp: '50' }] });
        }
        if (sql.includes('SELECT tier FROM customers')) {
          return Promise.resolve({ rows: [{ tier: 'bronze' }] });
        }
        if (sql.includes('SELECT multiplier FROM tier_benefits')) {
          return Promise.resolve({ rows: [{ multiplier: '1.0' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.earnPoints(tenantId, customerId, 'branch-1', 'inv-small', 15)
      ).rejects.toThrow('Amount is less than minimum purchase threshold (50 EGP)');

      expect(LedgerService.insert).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should skip LedgerService.insert when calculated points floor to 0 above threshold', async () => {
      const tenantId = 'tenant-123';
      const customerId = 'cust-1';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT points_per_egp, min_purchase_egp FROM tenants')) {
          return Promise.resolve({ rows: [{ points_per_egp: '0.1', min_purchase_egp: '0' }] });
        }
        if (sql.includes('SELECT tier FROM customers')) {
          return Promise.resolve({ rows: [{ tier: 'bronze' }] });
        }
        if (sql.includes('SELECT multiplier FROM tier_benefits')) {
          return Promise.resolve({ rows: [{ multiplier: '1.0' }] });
        }
        if (sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rows: [{ id: 'tx-zero-pts' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      (db.query as any).mockResolvedValue({
        rows: [{ id: customerId, tenant_id: tenantId, points_balance: 0 }],
      });

      await LoyaltyService.earnPoints(tenantId, customerId, 'branch-1', 'inv-zero-pts', 5);

      expect(LedgerService.insert).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should return existing summary idempotently without writing ledger on duplicate invoice', async () => {
      const tenantId = 'tenant-123';
      const customerId = 'cust-1';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT points_per_egp, min_purchase_egp FROM tenants')) {
          return Promise.resolve({ rows: [{ points_per_egp: '1', min_purchase_egp: '0' }] });
        }
        if (sql.includes('SELECT tier FROM customers')) {
          return Promise.resolve({ rows: [{ tier: 'bronze' }] });
        }
        if (sql.includes('SELECT multiplier FROM tier_benefits')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      (db.query as any).mockResolvedValue({
        rows: [{ id: customerId, tenant_id: tenantId, points_balance: 100 }],
      });

      const summary = await LoyaltyService.earnPoints(tenantId, customerId, 'branch-1', 'inv-dup', 100);

      expect(LedgerService.insert).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(summary.points_balance).toBe(100);
    });
  });

  describe('1.3 adjustPoints Validation & Signed Entries', () => {
    it('should insert adjustment credit for positive points', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT COALESCE(cb.current_balance, 0) AS balance')) {
          return Promise.resolve({ rows: [{ balance: 100 }] });
        }
        return Promise.resolve({ rows: [] });
      });
      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ rows: [] });

      const result = await LoyaltyService.adjustPoints('tenant-1', 'cust-1', 100, 'Promo bonus');

      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          tenantId: 'tenant-1',
          customerId: 'cust-1',
          type: 'adjustment',
          points: 100,
          referenceType: 'adjustment',
          note: 'Promo bonus',
        })
      );
      expect(result).toEqual({ success: true, newBalance: 200 });
    });

    it('should insert reversal debit for negative points within balance', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT COALESCE(cb.current_balance, 0) AS balance')) {
          return Promise.resolve({ rows: [{ balance: 100 }] });
        }
        return Promise.resolve({ rows: [] });
      });
      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ rows: [] });

      const result = await LoyaltyService.adjustPoints('tenant-1', 'cust-1', -50);

      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          type: 'reversal',
          points: 50,
          note: 'Manual points adjustment',
        })
      );
      expect(result).toEqual({ success: true, newBalance: 50 });
    });

    it('should reject negative adjustment that would make balance negative', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT COALESCE(cb.current_balance, 0) AS balance')) {
          return Promise.resolve({ rows: [{ balance: 100 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.adjustPoints('tenant-1', 'cust-1', -200)
      ).rejects.toThrow('Cannot reverse 200 points; available balance is 100');

      expect(LedgerService.insert).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('1.4 Customer OTP Verification Guard & Edge Cases for Redemptions', () => {
    it('should reject redemption if customer is unverified (is_verified = false)', async () => {
      const tenantId = 'tenant-123';
      const customerId = 'cust-pos-unverified';
      const rewardId = 'reward-free-coffee';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT c.id') && sql.includes('is_verified')) {
          return Promise.resolve({
            rows: [{ id: customerId, tier: 'bronze', is_verified: false, points_balance: 500 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.redeemReward(tenantId, customerId, rewardId)
      ).rejects.toThrow('Customer phone must be verified via OTP before redeeming rewards');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject redemption when customer balance is insufficient', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT c.id') && sql.includes('is_verified')) {
          return Promise.resolve({
            rows: [{ id: 'cust-1', tier: 'silver', is_verified: true, points_balance: 100 }],
          });
        }
        if (sql.includes('UPDATE rewards') && sql.includes('current_redemptions')) {
          return Promise.resolve({
            rows: [{ id: 'rw-1', name: 'Latte', required_points: 500, code_validity_hours: 24, min_tier: null }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.redeemReward('tenant-1', 'cust-1', 'rw-1')
      ).rejects.toThrow('Insufficient points balance. Required: 500, Available: 100');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject redemption when customer tier is below reward min_tier', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT c.id') && sql.includes('is_verified')) {
          return Promise.resolve({
            rows: [{ id: 'cust-1', tier: 'bronze', is_verified: true, points_balance: 1000 }],
          });
        }
        if (sql.includes('UPDATE rewards') && sql.includes('current_redemptions')) {
          return Promise.resolve({
            rows: [{ id: 'rw-vip', name: 'VIP Gift', required_points: 200, code_validity_hours: 24, min_tier: 'gold' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.redeemReward('tenant-1', 'cust-1', 'rw-vip')
      ).rejects.toThrow('Reward is restricted to gold tier and above');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should allow redemption if customer is OTP verified and has sufficient balance', async () => {
      const tenantId = 'tenant-123';
      const customerId = 'cust-verified';
      const rewardId = 'reward-free-coffee';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT c.id') && sql.includes('is_verified')) {
          return Promise.resolve({
            rows: [{ id: customerId, tier: 'bronze', is_verified: true, points_balance: 500 }],
          });
        }
        if (sql.includes('UPDATE rewards') && sql.includes('current_redemptions')) {
          return Promise.resolve({
            rows: [
              {
                id: rewardId,
                name: 'Free Coffee',
                required_points: 150,
                code_validity_hours: 24,
                min_tier: null,
              },
            ],
          });
        }
        if (sql.includes('SELECT generate_redemption_code()')) {
          return Promise.resolve({
            rows: [{ code: 'REW-999888' }],
          });
        }
        if (sql.includes('INSERT INTO redemptions')) {
          return Promise.resolve({
            rows: [{ id: 'red-001', code: 'REW-999888' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ id: 'ledger-red-1' });

      const result = await LoyaltyService.redeemReward(tenantId, customerId, rewardId);

      expect(result.redemptionCode).toBe('REW-999888');
      expect(result.remainingBalance).toBe(350);
      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          type: 'redeemed',
          points: 150,
        })
      );
    });
  });
});
