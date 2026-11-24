import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateCrossTenantPoints, roundEgpAmount } from '../../helpers/networkRates.js';
import { NetworkExchangeService } from '../networkExchange.js';
import { NetworkSettlementService } from '../networkSettlement.js';
import { NetworkCustomerService } from '../networkCustomer.js';
import { NetworkError, NetworkService } from '../network.js';
import { LedgerService } from '../ledger.js';
import { OTPService } from '../otp.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');
vi.mock('../network.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../network.js')>();
  return {
    ...actual,
    NetworkService: {
      ...actual.NetworkService,
      isMember: vi.fn(),
    },
  };
});
vi.mock('../ledger.js');
vi.mock('../otp.js');

describe('MO2-P4 Cross-Tenant Loyalty Networks (Phases 2–5)', () => {
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

  describe('Phase 2: Pure Conversion Math & Exchange Rates', () => {
    it('should convert points across different EGP valuations conservatively', () => {
      // 100 pts @ 0.25 EGP/pt = 25 EGP; target @ 0.50 EGP/pt = 50 pts
      expect(calculateCrossTenantPoints(100, 0.25, 0.5)).toEqual({
        sourcePoints: 100,
        sourceEgpPerPoint: 0.25,
        targetEgpPerPoint: 0.5,
        egpValue: 25,
        targetPointsEquivalent: 50,
      });

      // Floor fractional equivalent points (e.g. 10 pts @ 0.15 = 1.5 EGP / 0.40 = 3.75 -> 3)
      expect(calculateCrossTenantPoints(10, 0.15, 0.4).targetPointsEquivalent).toBe(3);
      expect(roundEgpAmount(12.345)).toBe(12.35);
    });

    it('should reject invalid conversion parameters', () => {
      expect(() => calculateCrossTenantPoints(0, 0.2, 0.2)).toThrow('positive integer');
      expect(() => calculateCrossTenantPoints(10, 0, 0.2)).toThrow('greater than 0');
      expect(() => calculateCrossTenantPoints(10, 0.2, -1)).toThrow('greater than 0');
    });

    it('should require active membership before upserting exchange rate', async () => {
      (NetworkService.isMember as any).mockResolvedValue(false);

      await expect(
        NetworkExchangeService.upsertTenantRate('net-1', 'tenant-A', 0.25)
      ).rejects.toMatchObject({ code: 'NOT_NETWORK_MEMBER' });

      (NetworkService.isMember as any).mockResolvedValue(true);
      (db.query as any).mockResolvedValue({
        rows: [{ id: 'rate-1', network_id: 'net-1', tenant_id: 'tenant-A', egp_per_point: 0.25, is_active: true }],
      });

      const rate = await NetworkExchangeService.upsertTenantRate('net-1', 'tenant-A', 0.25);
      expect(rate.egp_per_point).toBe(0.25);
    });
  });

  describe('Phase 3: Cross-Tenant Redemption & Network Ledger', () => {
    it('should short-circuit idempotently when idempotencyKey already exists', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM cross_tenant_redemptions ctr')) {
          return Promise.resolve({
            rows: [{ id: 'xnet-existing', redemption_code: 'CAFE-112233', status: 'completed' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await NetworkExchangeService.redeemAcrossNetwork({
        networkId: 'net-1',
        sourceTenantId: 'tenant-A',
        sourceCustomerId: 'cust-A',
        targetTenantId: 'tenant-B',
        targetRewardId: 'rw-B',
        sourcePoints: 100,
        idempotencyKey: 'req-dup-1',
      });

      expect(res.idempotentReplay).toBe(true);
      expect(res.redemption_code).toBe('CAFE-112233');
      expect(LedgerService.insert).not.toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should reject unverified customer and execute balanced ledger + redemption on valid request', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM network_memberships nm')) {
          return Promise.resolve({ rows: [{ tenant_id: 'tenant-A' }, { tenant_id: 'tenant-B' }] });
        }
        if (sql.includes('FROM point_exchange_rates')) {
          return Promise.resolve({
            rows: [
              { tenant_id: 'tenant-A', egp_per_point: 0.5 },
              { tenant_id: 'tenant-B', egp_per_point: 0.25 },
            ],
          });
        }
        if (sql.includes('FROM customers c')) {
          return Promise.resolve({
            rows: [{ id: 'cust-A', is_verified: false, points_balance: 500 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        NetworkExchangeService.redeemAcrossNetwork({
          networkId: 'net-1',
          sourceTenantId: 'tenant-A',
          sourceCustomerId: 'cust-A',
          targetTenantId: 'tenant-B',
          targetRewardId: 'rw-B',
          sourcePoints: 100,
        })
      ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_VERIFIED' });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');

      // Happy path
      vi.clearAllMocks();
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM network_memberships nm')) {
          return Promise.resolve({ rows: [{ tenant_id: 'tenant-A' }, { tenant_id: 'tenant-B' }] });
        }
        if (sql.includes('FROM point_exchange_rates')) {
          return Promise.resolve({
            rows: [
              { tenant_id: 'tenant-A', egp_per_point: 0.5 },
              { tenant_id: 'tenant-B', egp_per_point: 0.25 },
            ],
          });
        }
        if (sql.includes('FROM customers c')) {
          return Promise.resolve({
            rows: [{ id: 'cust-A', phone: '01012345678', name: 'Customer A', is_verified: true, points_balance: 500 }],
          });
        }
        if (sql.includes('INSERT INTO customers')) {
          return Promise.resolve({
            rows: [{ id: 'cust-B' }],
          });
        }
        if (sql.includes('UPDATE rewards')) {
          return Promise.resolve({
            rows: [{ id: 'rw-B', name: 'Iced Mocha', required_points: 150, code_validity_hours: 24 }],
          });
        }
        if (sql.includes('SELECT generate_redemption_code()')) {
          return Promise.resolve({ rows: [{ code: 'CAFE-998877' }] });
        }
        if (sql.includes('INSERT INTO redemptions')) {
          return Promise.resolve({ rows: [{ id: 'red-B-1', code: 'CAFE-998877' }] });
        }
        if (sql.includes('INSERT INTO cross_tenant_redemptions')) {
          return Promise.resolve({ rows: [{ id: 'xnet-1', egp_value: 50, target_points_equivalent: 200 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ rows: [] });

      const result = await NetworkExchangeService.redeemAcrossNetwork({
        networkId: 'net-1',
        sourceTenantId: 'tenant-A',
        sourceCustomerId: 'cust-A',
        targetTenantId: 'tenant-B',
        targetRewardId: 'rw-B',
        sourcePoints: 100,
        idempotencyKey: 'idem-xnet-1',
      });

      expect(result.redemption_code).toBe('CAFE-998877');
      expect(result.idempotentReplay).toBe(false);
      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          tenantId: 'tenant-A',
          customerId: 'cust-A',
          type: 'redeemed',
          points: 100,
          referenceType: 'cross_tenant_redemption',
          idempotencyKey: 'xnet-src:idem-xnet-1',
        })
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('Phase 4: Inter-Tenant Settlements', () => {
    it('should lock unsettled redemptions, create settlement batch, and mark items settled', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM cross_tenant_redemptions')) {
          return Promise.resolve({
            rows: [
              { id: 'xr-1', egp_value: 25.5 },
              { id: 'xr-2', egp_value: 14.5 },
            ],
          });
        }
        if (sql.includes('INSERT INTO settlements')) {
          return Promise.resolve({
            rows: [{ id: 'set-1', amount_egp: 40, method: 'subscription_deduction', status: 'pending' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await NetworkSettlementService.createSettlement({
        networkId: 'net-1',
        fromTenantId: 'tenant-A',
        toTenantId: 'tenant-B',
        method: 'subscription_deduction',
      });

      expect(res.itemsCount).toBe(2);
      expect(res.settlement.amount_egp).toBe(40);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should deduct via billing_history when processing subscription_deduction settlement', async () => {
      const settlementId = '11111111-1111-1111-1111-111111111111';
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT * FROM settlements')) {
          return Promise.resolve({
            rows: [
              {
                id: settlementId,
                network_id: 'net-1',
                from_tenant_id: 'tenant-A',
                to_tenant_id: 'tenant-B',
                amount_egp: 40,
                method: 'subscription_deduction',
                status: 'pending',
              },
            ],
          });
        }
        if (sql.includes('FROM subscriptions')) {
          return Promise.resolve({ rows: [{ id: 'sub-1', status: 'active' }] });
        }
        if (sql.includes('INSERT INTO billing_history')) {
          return Promise.resolve({ rows: [{ id: 'bill-99' }] });
        }
        if (sql.includes('UPDATE settlements')) {
          return Promise.resolve({
            rows: [{ id: settlementId, status: 'completed', billing_history_id: 'bill-99' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const completed = await NetworkSettlementService.processSettlementJob(settlementId);

      expect(completed.status).toBe('completed');
      expect(completed.billing_history_id).toBe('bill-99');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('Phase 5: Unified Network Customer Identity & OTP Linking', () => {
    it('should verify OTP, create/link network_customers identity, and return unified wallets', async () => {
      (NetworkService.isMember as any).mockResolvedValue(true);
      (OTPService.verifyOTP as any).mockResolvedValue(true);

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM customers')) {
          return Promise.resolve({ rows: [{ id: 'cust-A', name: 'Momen', phone: '01012345678' }] });
        }
        if (sql.includes('INSERT INTO network_customers')) {
          return Promise.resolve({ rows: [{ id: 'nc-1', network_id: 'net-1', phone: '01012345678', is_verified: true }] });
        }
        return Promise.resolve({ rows: [] });
      });

      (db.query as any)
        .mockResolvedValueOnce({
          rows: [{ id: 'nc-1', network_id: 'net-1', phone: '01012345678', display_name: 'Momen', is_verified: true }],
        })
        .mockResolvedValueOnce({
          rows: [
            { tenant_id: 'tenant-A', tenant_name: 'Cafe A', points_balance: 200, egp_per_point: 0.25, egp_value: 50 },
            { tenant_id: 'tenant-B', tenant_name: 'Cafe B', points_balance: 100, egp_per_point: 0.3, egp_value: 30 },
          ],
        });

      const wallet = await NetworkCustomerService.verifyAndLinkCustomer('net-1', 'tenant-A', '01012345678', '654321');

      expect(OTPService.verifyOTP).toHaveBeenCalledWith('tenant-A', '01012345678', '654321');
      expect(wallet.linkedWallets).toHaveLength(2);
      expect(wallet.totalEgpValue).toBe(80);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should reject OTP linking request if customer phone does not exist under tenant', async () => {
      (NetworkService.isMember as any).mockResolvedValue(true);
      (db.query as any).mockResolvedValue({ rows: [] });

      await expect(
        NetworkCustomerService.requestLinkOtp('net-1', 'tenant-A', '01099999999')
      ).rejects.toThrow(NetworkError);
      await expect(
        NetworkCustomerService.requestLinkOtp('net-1', 'tenant-A', '01099999999')
      ).rejects.toMatchObject({ code: 'CUSTOMER_NOT_FOUND' });
    });
  });
});
