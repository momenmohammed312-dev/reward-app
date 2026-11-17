import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { WebhookController } from '../webhookController.js';
import db from '../../config/db.js';
import { webhookQueue } from '../../services/webhookProcessor.js';

vi.mock('../../config/db.js');
vi.mock('../../services/webhookProcessor.js', () => ({
  webhookQueue: {
    add: vi.fn().mockResolvedValue({ id: 'job-123' }),
  },
}));

describe('WebhookController — Phase 1 Acceptance Tests', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();

    process.env.NODE_ENV = 'production';

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('1.2 should fail-closed (403) if no integration secret exists in production', async () => {
    req = {
      params: { tenant_id: '11111111-1111-1111-1111-111111111111' },
      body: { event: 'order.paid', order: { id: 'ord-1' } },
      headers: { 'x-foodics-signature': 'any-sig' },
    };

    (db.query as any).mockResolvedValue({ rows: [] });

    await WebhookController.handleFoodicsWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'POS integration secret not configured for tenant' })
    );
    expect(webhookQueue.add).not.toHaveBeenCalled();
  });

  it('1.2 should reject invalid HMAC signature with 403 using timingSafeEqual', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const secret = 'real_secret_key_123';

    req = {
      params: { tenant_id: tenantId },
      body: { event: 'order.paid', order: { id: 'ord-1' } },
      headers: { 'x-foodics-signature': 'invalid_forged_signature_hex' },
    };

    (db.query as any).mockImplementation((sql: string) => {
      if (sql.includes('FROM pos_integrations')) {
        return Promise.resolve({ rows: [{ webhook_secret: secret }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await WebhookController.handleFoodicsWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid webhook signature' })
    );
    expect(webhookQueue.add).not.toHaveBeenCalled();
  });

  it('1.3 should reject signature signed with Tenant A secret when sent to Tenant B URL', async () => {
    const tenantBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const tenantASecret = 'secret_for_tenant_a';
    const tenantBSecret = 'secret_for_tenant_b';

    const payload = { event: 'order.paid', order: { id: 'ord-cross-tenant' } };
    const rawPayload = JSON.stringify(payload);

    const signatureFromTenantA = crypto
      .createHmac('sha256', tenantASecret)
      .update(rawPayload)
      .digest('hex');

    req = {
      params: { tenant_id: tenantBId },
      body: payload,
      headers: { 'x-foodics-signature': signatureFromTenantA },
    };

    (db.query as any).mockImplementation((sql: string, params?: any[]) => {
      if (sql.includes('FROM pos_integrations') && params?.[0] === tenantBId) {
        return Promise.resolve({ rows: [{ webhook_secret: tenantBSecret }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await WebhookController.handleFoodicsWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid webhook signature' })
    );
    expect(webhookQueue.add).not.toHaveBeenCalled();
  });

  it('should accept valid signature and queue the job', async () => {
    const tenantId = '11111111-1111-1111-1111-111111111111';
    const secret = 'super_secret_pos_key';
    const payload = { event: 'order.paid', order: { id: 'ord-valid-1' } };
    const rawPayload = JSON.stringify(payload);

    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(rawPayload)
      .digest('hex');

    req = {
      params: { tenant_id: tenantId },
      body: payload,
      headers: { 'x-foodics-signature': validSignature },
    };

    (db.query as any).mockImplementation((sql: string) => {
      if (sql.includes('FROM pos_integrations')) {
        return Promise.resolve({ rows: [{ webhook_secret: secret }] });
      }
      if (sql.includes('INSERT INTO webhook_logs')) {
        return Promise.resolve({ rows: [{ id: 'log-999' }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await WebhookController.handleFoodicsWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'queued', log_id: 'log-999' });
    expect(webhookQueue.add).toHaveBeenCalledWith(
      'process-webhook',
      expect.objectContaining({
        tenantId,
        eventType: 'order.paid',
        logId: 'log-999',
      }),
      expect.objectContaining({
        jobId: `foodics_${tenantId}_ord-valid-1`,
      })
    );
  });
});
