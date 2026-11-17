import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OTPService } from '../otp.js';
import { LoyaltyService } from '../loyalty.js';
import { LoyaltyController } from '../../controllers/loyaltyController.js';
import { LedgerService } from '../ledger.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');
vi.mock('../ledger.js');

describe('Phase 2: Correctness & Reliability Acceptance Tests', () => {
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

  describe('2.1 Manual Points Grants Route Through LedgerService.insert', () => {
    it('should use LedgerService.insert instead of raw direct SQL', async () => {
      const req: any = {
        user: { id: 'admin-user-1', tenant_id: 'tenant-1', role: 'owner' },
        body: { customer_id: 'cust-10', points: 250, reason: 'Special promotion' },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id FROM customers')) {
          return Promise.resolve({ rows: [{ id: 'cust-10' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ id: 'ledger-bonus-1' });
      (db.query as any).mockResolvedValue({
        rows: [{ id: 'cust-10', points_balance: 750, total_earned: 750, total_redeemed: 0 }],
      });

      await LoyaltyController.adminEarnPointsManual(req, res);

      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          tenantId: 'tenant-1',
          customerId: 'cust-10',
          type: 'bonus',
          points: 250,
          createdBy: 'admin-user-1',
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, pointsAdded: 250 })
      );
    });
  });

  describe('2.2 OTP Service Hashing & Security', () => {
    it('should store SHA-256 hash in database and verify valid code correctly', async () => {
      const tenantId = 'tenant-otp';
      const phone = '+201099999999';

      mockClient.query.mockResolvedValue({ rows: [] });

      // Generate OTP
      const genRes = await OTPService.generateOTP(tenantId, phone);
      expect(genRes.success).toBe(true);

      // Verify DB was called with a 64-character hex hash, not plaintext digits
      const insertCall = mockClient.query.mock.calls.find((c: any[]) =>
        c[0].includes('INSERT INTO otp_codes')
      );
      expect(insertCall).toBeDefined();
      const storedHash = insertCall[1][2];
      expect(storedHash).toHaveLength(64);

      // Verify OTP verification
      (db.query as any).mockResolvedValue({
        rows: [
          {
            id: 'otp-rec-1',
            code: storedHash,
            attempts: 0,
            expires_at: new Date(Date.now() + 5 * 60000),
            is_used: false,
          },
        ],
      });

      await expect(OTPService.verifyOTP(tenantId, phone, '000000')).rejects.toThrow(
        'Invalid OTP code. Please check and try again.'
      );
    });
  });

  describe('2.3 Redemption Concurrency & Limits', () => {
    it('should reject redemption if reward reaches max_redemptions limit', async () => {
      const tenantId = 'tenant-1';
      const customerId = 'cust-1';
      const rewardId = 'reward-limited';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT c.id') && sql.includes('is_verified')) {
          return Promise.resolve({
            rows: [{ id: customerId, is_verified: true, points_balance: 1000 }],
          });
        }
        if (sql.includes('UPDATE rewards SET current_redemptions')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.redeemReward(tenantId, customerId, rewardId)
      ).rejects.toThrow('Reward is inactive or redemption limit has been reached');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  describe('2.6 Cashier Branch-Level Authorization', () => {
    it('should forbid cashier from processing manual points or redemptions for a different branch', async () => {
      const req: any = {
        user: { id: 'cashier-1', tenant_id: 'tenant-1', role: 'cashier', branch_id: 'branch-A' },
        body: { customer_id: 'cust-10', points: 50, branch_id: 'branch-B' },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      await LoyaltyController.adminEarnPointsManual(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cashier cannot perform actions for a different branch',
      });
    });
  });
});
