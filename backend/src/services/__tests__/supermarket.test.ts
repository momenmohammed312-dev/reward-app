import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { CustomApiAdapter } from '../pos/customApiAdapter.js';
import { getAdapter } from '../pos/adapterRegistry.js';
import { WebhookController } from '../../controllers/webhookController.js';
import { LoyaltyService } from '../loyalty.js';
import { LoyaltyController } from '../../controllers/loyaltyController.js';
import { LedgerService } from '../ledger.js';
import { AdminOpsService } from '../adminOps.js';
import { webhookQueue } from '../webhookProcessor.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');
vi.mock('../ledger.js');
vi.mock('../webhookProcessor.js', () => ({
  webhookQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-supermarket-1' }),
  },
}));

describe('Supermarket & Multi-Vertical Support', () => {
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

  describe('CustomApiAdapter (Retail / Supermarket POS)', () => {
    it('is registered in adapterRegistry and maps flat retail payloads with excluded items', () => {
      const adapter = getAdapter('custom_api');
      expect(adapter).toBeInstanceOf(CustomApiAdapter);

      const order = adapter.parseOrder({
        customer_phone: '+201012345678',
        customer_name: 'محمود سعيد',
        total_amount: 650,
        invoice_id: 'MKT-5510',
        branch_id: 'nasr-city-1',
        branch_name: 'فرع مدينة نصر',
        items: [
          { amount: 500, excluded: false },
          { amount: 150, excluded: true },
        ],
      });

      expect(order).toEqual({
        customerPhone: '01012345678',
        customerName: 'محمود سعيد',
        totalAmount: 500,
        invoiceId: 'MKT-5510',
        branchLocationId: 'nasr-city-1',
        branchName: 'فرع مدينة نصر',
      });
    });

    it('supports nested Odoo/ERP order envelopes and missing field fallbacks', () => {
      const adapter = new CustomApiAdapter();
      const order = adapter.parseOrder({
        order: {
          customer: { phone: '01122334455', name: 'نادية' },
          total: 320,
          receipt_number: 'ODOO-992',
          branch: { id: 'br-2', name: 'التجمع' },
        },
      });

      expect(order.customerPhone).toBe('01122334455');
      expect(order.totalAmount).toBe(320);
      expect(order.invoiceId).toBe('ODOO-992');
      expect(order.branchLocationId).toBe('br-2');

      const emptyOrder = adapter.parseOrder({});
      expect(emptyOrder.customerPhone).toBe('');
      expect(emptyOrder.totalAmount).toBe(0);
    });
  });

  describe('WebhookController.handleProviderWebhook', () => {
    let res: any;

    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
    });

    it('rejects unsupported POS provider with 400', async () => {
      const req: any = {
        params: { provider: 'unknown_pos', tenant_id: '11111111-1111-1111-1111-111111111111' },
        body: {},
        headers: {},
      };

      await WebhookController.handleProviderWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported POS provider' });
    });

    it('rejects invalid HMAC and cross-tenant signature with 403', async () => {
      const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
      const payload = { event: 'order.paid', invoice_id: 'MKT-101', total_amount: 400 };
      const forgedSig = crypto
        .createHmac('sha256', 'wrong_tenant_secret')
        .update(JSON.stringify(payload))
        .digest('hex');

      const req: any = {
        params: { provider: 'custom_api', tenant_id: tenantB },
        body: payload,
        headers: { 'x-webhook-signature': forgedSig },
      };

      (db.query as any).mockImplementation((sql: string) => {
        if (sql.includes('FROM pos_integrations')) {
          return Promise.resolve({ rows: [{ webhook_secret: 'tenant_b_secret' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await WebhookController.handleProviderWebhook(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(webhookQueue.add).not.toHaveBeenCalled();
    });

    it('accepts valid custom_api HMAC signature and enqueues job with provider', async () => {
      const tenantId = '11111111-1111-1111-1111-111111111111';
      const secret = 'supermarket_erp_secret';
      const payload = {
        event: 'order.paid',
        invoice_id: 'MKT-777',
        customer_phone: '01012345678',
        total_amount: 500,
      };
      const sig = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const req: any = {
        params: { provider: 'custom_api', tenant_id: tenantId },
        body: payload,
        headers: { 'x-webhook-signature': sig },
      };

      (db.query as any).mockImplementation((sql: string) => {
        if (sql.includes('FROM pos_integrations')) {
          return Promise.resolve({ rows: [{ webhook_secret: secret }] });
        }
        if (sql.includes('INSERT INTO webhook_logs')) {
          return Promise.resolve({ rows: [{ id: 'log-mkt-1' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await WebhookController.handleProviderWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'queued', log_id: 'log-mkt-1' });
      expect(webhookQueue.add).toHaveBeenCalledWith(
        'process-webhook',
        expect.objectContaining({
          tenantId,
          provider: 'custom_api',
          logId: 'log-mkt-1',
        }),
        expect.objectContaining({
          jobId: `custom_api_${tenantId}_MKT-777`,
        })
      );
    });
  });

  describe('LoyaltyService.earnFromCashierInvoice & CashierController', () => {
    it('auto-registers walk-in shopper and awards invoice-calculated points', async () => {
      const tenantId = 'tenant-mkt';
      const branchId = 'branch-mkt-1';
      const newCustId = 'cust-walkin-1';

      (db.query as any).mockImplementation((sql: string) => {
        if (sql.includes('FROM branches')) {
          return Promise.resolve({ rows: [{ id: branchId }] });
        }
        if (sql.includes('SELECT id FROM customers')) {
          return Promise.resolve({ rows: [] });
        }
        if (sql.includes('INSERT INTO customers')) {
          return Promise.resolve({ rows: [{ id: newCustId }] });
        }
        if (sql.includes('FROM customer_summary')) {
          return Promise.resolve({
            rows: [{ id: newCustId, tenant_id: tenantId, points_balance: 100 }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT points_per_egp, min_purchase_egp FROM tenants')) {
          return Promise.resolve({ rows: [{ points_per_egp: '0.2', min_purchase_egp: '50' }] });
        }
        if (sql.includes('SELECT tier FROM customers')) {
          return Promise.resolve({ rows: [{ tier: 'bronze' }] });
        }
        if (sql.includes('SELECT multiplier FROM tier_benefits')) {
          return Promise.resolve({ rows: [{ multiplier: '1.0' }] });
        }
        if (sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rows: [{ id: 'tx-mkt-10' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ rows: [{ id: 'led-1' }] });

      const result = await LoyaltyService.earnFromCashierInvoice({
        tenantId,
        customerPhone: '01099887766',
        amountEgp: 500,
        invoiceId: 'INV-MKT-10',
      });

      expect(result.customerCreated).toBe(true);
      expect(result.pointsEarned).toBe(100);
      expect(result.duplicate).toBe(false);
      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          tenantId,
          customerId: newCustId,
          type: 'earned',
          points: 100,
          idempotencyKey: `earn:${tenantId}:INV-MKT-10`,
        })
      );
    });

    it('rejects foreign tenant branch on cashierEarnByInvoice and enforces branch isolation', async () => {
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      const reqForeignBranch: any = {
        user: { id: 'cashier-1', tenant_id: 'tenant-A', role: 'cashier', branch_id: 'branch-A' },
        body: { customer_phone: '01012345678', amount_egp: 200, branch_id: 'branch-B' },
      };

      await LoyaltyController.cashierEarnByInvoice(reqForeignBranch, res);
      expect(res.status).toHaveBeenCalledWith(403);

      // Foreign tenant branch owned by another tenant returns 400 (Branch not found)
      (db.query as any).mockResolvedValue({ rows: [] });
      await expect(
        LoyaltyService.earnFromCashierInvoice({
          tenantId: 'tenant-A',
          customerPhone: '01012345678',
          amountEgp: 200,
          branchId: 'foreign-branch',
        })
      ).rejects.toThrow('Branch not found');
    });

    it('returns 409 on duplicate invoice in cashierEarnByInvoice', async () => {
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };

      vi.spyOn(LoyaltyService, 'earnFromCashierInvoice').mockResolvedValueOnce({
        customerId: 'cust-1',
        customerCreated: false,
        invoiceId: 'INV-DUP',
        amountEgp: 300,
        pointsEarned: 0,
        duplicate: true,
        summary: { id: 'cust-1', points_balance: 60 },
      });

      const req: any = {
        user: { id: 'cashier-1', tenant_id: 'tenant-A', role: 'cashier' },
        body: { customer_phone: '01012345678', amount_egp: 300, invoice_id: 'INV-DUP' },
      };

      await LoyaltyController.cashierEarnByInvoice(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('LoyaltyService.refundPoints (Partial Refund)', () => {
    it('claws back proportional points for partial refund and blocks over-refund', async () => {
      const tenantId = 'tenant-mkt';
      const invoiceId = 'INV-PART-1';
      const customerId = 'cust-1';

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, customer_id, amount, points_earned FROM transactions')) {
          return Promise.resolve({
            rows: [{ id: 'tx-1', customer_id: customerId, amount: 500, points_earned: 100 }],
          });
        }
        if (sql.includes('COALESCE(SUM(points), 0)')) {
          return Promise.resolve({ rows: [{ reversed_points: 0 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ rows: [] });
      (db.query as any).mockResolvedValue({
        rows: [{ id: customerId, tenant_id: tenantId, points_balance: 60 }],
      });

      const summary = await LoyaltyService.refundPoints(tenantId, invoiceId, 'Partial return', 200);
      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          type: 'reversal',
          points: 40,
          idempotencyKey: `reversal:${tenantId}:${invoiceId}:partial:200:0`,
        })
      );
      expect(summary.points_balance).toBe(60);

      // Over-refund attempt when 80 points were already reversed
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT id, customer_id, amount, points_earned FROM transactions')) {
          return Promise.resolve({
            rows: [{ id: 'tx-1', customer_id: customerId, amount: 500, points_earned: 100 }],
          });
        }
        if (sql.includes('COALESCE(SUM(points), 0)')) {
          return Promise.resolve({ rows: [{ reversed_points: 80 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.refundPoints(tenantId, invoiceId, 'Second return', 200)
      ).rejects.toThrow('Partial refund exceeds remaining refundable points');
    });
  });

  describe('Manager Suite: Code Prefix, Cashier Limits, Campaigns & Foreign-Tenant Guard', () => {
    it('passes tenant code_prefix (MKT) to generate_redemption_code($1)', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT c.id') && sql.includes('is_verified')) {
          return Promise.resolve({ rows: [{ id: 'cust-1', tier: 'gold', is_verified: true, points_balance: 500 }] });
        }
        if (sql.includes('UPDATE rewards')) {
          return Promise.resolve({
            rows: [{ id: 'rw-1', name: 'قسيمة 50 ج.م', required_points: 200, code_validity_hours: 24, min_tier: null }],
          });
        }
        if (sql.includes('SELECT code_prefix FROM tenants')) {
          return Promise.resolve({ rows: [{ code_prefix: 'MKT' }] });
        }
        if (sql.includes('SELECT generate_redemption_code(')) {
          return Promise.resolve({ rows: [{ code: 'MKT-112233' }] });
        }
        if (sql.includes('INSERT INTO redemptions')) {
          return Promise.resolve({ rows: [{ id: 'red-mkt-1', code: 'MKT-112233' }] });
        }
        return Promise.resolve({ rows: [] });
      });
      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ id: 'led-red' });

      const res = await LoyaltyService.redeemReward('tenant-mkt', 'cust-1', 'rw-1');
      expect(res.code).toBe('MKT-112233');
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT generate_redemption_code($1) as code',
        ['MKT']
      );
    });

    it('blocks cashier role above cashier_max_invoice_egp while allowing manager', async () => {
      (db.query as any).mockImplementation((sql: string) => {
        if (sql.includes('cashier_max_invoice_egp')) {
          return Promise.resolve({ rows: [{ cashier_max_invoice_egp: '5000' }] });
        }
        if (sql.includes('FROM branches')) {
          return Promise.resolve({ rows: [{ id: 'branch-1' }] });
        }
        if (sql.includes('SELECT id FROM customers')) {
          return Promise.resolve({ rows: [{ id: 'cust-1' }] });
        }
        if (sql.includes('FROM customer_summary')) {
          return Promise.resolve({ rows: [{ id: 'cust-1', tenant_id: 'tenant-mkt', points_balance: 1200 }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(
        LoyaltyService.earnFromCashierInvoice({
          tenantId: 'tenant-mkt',
          customerPhone: '01012345678',
          amountEgp: 6000,
          actorRole: 'cashier',
        })
      ).rejects.toThrow('exceeds cashier limit');

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT points_per_egp, min_purchase_egp FROM tenants')) {
          return Promise.resolve({ rows: [{ points_per_egp: '0.2', min_purchase_egp: '50' }] });
        }
        if (sql.includes('SELECT tier FROM customers')) {
          return Promise.resolve({ rows: [{ tier: 'bronze' }] });
        }
        if (sql.includes('SELECT multiplier FROM tier_benefits')) {
          return Promise.resolve({ rows: [{ multiplier: '1.0' }] });
        }
        if (sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rows: [{ id: 'tx-mgr-1' }] });
        }
        return Promise.resolve({ rows: [] });
      });
      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ rows: [] });

      const mgrRes = await LoyaltyService.earnFromCashierInvoice({
        tenantId: 'tenant-mkt',
        customerPhone: '01012345678',
        amountEgp: 6000,
        actorRole: 'manager',
      });
      expect(mgrRes.pointsEarned).toBe(1200);
    });

    it('applies active Happy Hour campaign multiplier (x2) in earnPoints', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT points_per_egp, min_purchase_egp FROM tenants')) {
          return Promise.resolve({ rows: [{ points_per_egp: '0.2', min_purchase_egp: '50' }] });
        }
        if (sql.includes('SELECT tier FROM customers')) {
          return Promise.resolve({ rows: [{ tier: 'bronze' }] });
        }
        if (sql.includes('SELECT multiplier FROM tier_benefits')) {
          return Promise.resolve({ rows: [{ multiplier: '1.0' }] });
        }
        if (sql.includes('FROM campaigns')) {
          return Promise.resolve({
            rows: [{ id: 'camp-1', name: 'Happy Hour x2', multiplier: '2.00', is_active: true }],
          });
        }
        if (sql.includes('INSERT INTO transactions')) {
          return Promise.resolve({ rows: [{ id: 'tx-hh-1' }] });
        }
        return Promise.resolve({ rows: [] });
      });
      (LedgerService.insert as any) = vi.fn().mockResolvedValue({ rows: [] });
      (db.query as any).mockResolvedValue({ rows: [{ id: 'cust-1', points_balance: 200 }] });

      await LoyaltyService.earnPoints('tenant-mkt', 'cust-1', 'branch-1', 'INV-HH-1', 500);
      expect(LedgerService.insert).toHaveBeenCalledWith(
        mockClient,
        expect.objectContaining({
          points: 200,
          note: expect.stringContaining('[Happy Hour x2 ×2]'),
        })
      );
    });

    it('throws Customer not found when AdminOpsService.getCustomerLedger targets a foreign tenant', async () => {
      (db.query as any).mockResolvedValue({ rows: [] });
      await expect(
        AdminOpsService.getCustomerLedger('tenant-A', 'foreign-customer-id')
      ).rejects.toThrow('Customer not found');
    });
  });
});
