import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnalyticsService, AnalyticsError } from '../analytics.js';
import { AdminController } from '../../controllers/adminController.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');

describe('MO2-P3 AnalyticsService & Admin Analytics Endpoints', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';
  const branchId = '22222222-2222-2222-2222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    (db.query as any) = vi.fn();
  });

  describe('verifyBranchOwnership', () => {
    it('should return branch info when branch belongs to tenant and is active', async () => {
      (db.query as any).mockResolvedValue({
        rows: [{ id: branchId, name: 'Zamalek Branch', timezone: 'Africa/Cairo' }],
      });

      const branch = await AnalyticsService.verifyBranchOwnership(tenantId, branchId);

      expect(branch).toEqual({
        id: branchId,
        name: 'Zamalek Branch',
        timezone: 'Africa/Cairo',
      });
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL'),
        [branchId, tenantId]
      );
    });

    it('should throw BRANCH_NOT_FOUND for invalid UUID, soft-deleted branch, or foreign tenant branch', async () => {
      await expect(AnalyticsService.verifyBranchOwnership(tenantId, 'not-a-uuid')).rejects.toMatchObject({
        name: 'AnalyticsError',
        code: 'BRANCH_NOT_FOUND',
      });
      expect(db.query).not.toHaveBeenCalled();

      (db.query as any).mockResolvedValue({ rows: [] });
      await expect(AnalyticsService.verifyBranchOwnership(tenantId, branchId)).rejects.toThrow(AnalyticsError);
    });
  });

  describe('getRetentionAnalytics', () => {
    it('should compute tenant-wide repeat visit rate, busiest hours, top customers, and reward performance', async () => {
      (db.query as any)
        .mockResolvedValueOnce({
          rows: [{ total_active_customers: 10, repeat_customers: 4, avg_visits: '2.35' }],
        })
        .mockResolvedValueOnce({
          rows: [
            { hour: 9, orders_count: 3, points_awarded: 120 },
            { hour: 20, orders_count: 14, points_awarded: 650 },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'cust-1',
              name: 'Sara',
              phone: '01011112222',
              tier: 'gold',
              visits_count: 7,
              total_spent: '980',
              points_balance: 320,
              last_visit: '2026-11-16T10:00:00Z',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rw-1',
              title: 'Free Espresso',
              category: 'Coffee',
              required_points: 100,
              total_redemptions: 8,
              used_redemptions: 6,
            },
          ],
        });

      const report = await AnalyticsService.getRetentionAnalytics(tenantId);

      expect(report.branchId).toBeNull();
      expect(report.timezone).toBe('Africa/Cairo');
      expect(report.repeatVisitRate).toEqual({
        totalActiveCustomers: 10,
        repeatCustomers: 4,
        ratePercent: 40,
        avgVisitsPerCustomer: 2.35,
      });
      expect(report.busiestHours).toEqual([
        { hour: 9, label: '09:00 ص', ordersCount: 3, pointsAwarded: 120 },
        { hour: 20, label: '08:00 م', ordersCount: 14, pointsAwarded: 650 },
      ]);
      expect(report.topCustomers[0]).toMatchObject({
        id: 'cust-1',
        visitsCount: 7,
        totalSpent: 980,
        pointsBalance: 320,
      });
      expect(report.rewardPerformance[0]).toMatchObject({
        id: 'rw-1',
        conversionRate: 75,
      });
    });

    it('should scope queries and use branch timezone when branchId is supplied', async () => {
      (db.query as any)
        .mockResolvedValueOnce({
          rows: [{ id: branchId, name: 'Riyadh Branch', timezone: 'Asia/Riyadh' }],
        })
        .mockResolvedValueOnce({
          rows: [{ total_active_customers: 0, repeat_customers: 0, avg_visits: '0' }],
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const report = await AnalyticsService.getRetentionAnalytics(tenantId, branchId);

      expect(report.branchId).toBe(branchId);
      expect(report.timezone).toBe('Asia/Riyadh');
      expect(report.repeatVisitRate.ratePercent).toBe(0);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('AT TIME ZONE $2'),
        [tenantId, 'Asia/Riyadh', branchId]
      );
    });
  });

  describe('AdminController Branch Validation', () => {
    it('should return 404 when getRetentionAnalytics or getStats receives a foreign branch_id', async () => {
      const req: any = {
        user: { id: 'owner-1', tenant_id: tenantId, role: 'owner' },
        query: { branch_id: branchId },
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      (db.query as any).mockResolvedValue({ rows: [] });

      await AdminController.getRetentionAnalytics(req, res);
      expect(res.status).toHaveBeenCalledWith(404);

      vi.clearAllMocks();
      (db.query as any).mockResolvedValue({ rows: [] });
      await AdminController.getStats(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
