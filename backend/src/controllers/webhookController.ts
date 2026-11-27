import { Request, Response } from 'express';
import crypto from 'crypto';
import db from '../config/db.js';
import { webhookQueue } from '../services/webhookProcessor.js';
import { logger } from '../services/logger.js';

const SUPPORTED_PROVIDERS = new Set(['foodics', 'custom_api', 'square', 'toast']);

export class WebhookController {
  /**
   * Handle incoming Webhook from Foodics POS.
   * Enforces strict fail-closed signature verification and credential-based resolution.
   */
  static async handleFoodicsWebhook(req: Request, res: Response) {
    return WebhookController.handleProviderWebhookInternal(req, res, 'foodics');
  }

  /**
   * Handle incoming Webhook from any registered POS provider (supermarket/retail/cafe).
   */
  static async handleProviderWebhook(req: Request, res: Response) {
    const provider = String(req.params.provider || '').toLowerCase();
    if (!SUPPORTED_PROVIDERS.has(provider)) {
      return res.status(400).json({ error: 'Unsupported POS provider' });
    }
    return WebhookController.handleProviderWebhookInternal(req, res, provider);
  }

  private static async handleProviderWebhookInternal(req: Request, res: Response, provider: string) {
    try {
      const { tenant_id } = req.params;
      if (!tenant_id) {
        return res.status(400).json({ error: 'Missing tenant identifier' });
      }

      const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const signatureHeader =
        req.headers[`x-${provider}-signature`] ||
        req.headers['x-webhook-signature'] ||
        req.headers['x-pos-signature'] ||
        '';
      const incomingSignature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

      const isProduction = process.env.NODE_ENV === 'production';

      // 1. Resolve integration secret explicitly from pos_integrations table
      let webhookSecret: string | null = null;

      const integrationRes = await db.query(
        `SELECT webhook_secret FROM pos_integrations
         WHERE tenant_id = $1::uuid AND provider = $2 AND is_active = true
         LIMIT 1`,
        [tenant_id, provider]
      );

      if (integrationRes.rows.length > 0) {
        webhookSecret = integrationRes.rows[0].webhook_secret;
      } else {
        // Fallback: check branch api_key for legacy support
        const branchRes = await db.query(
          `SELECT api_key FROM branches
           WHERE tenant_id = $1::uuid AND is_active = true AND deleted_at IS NULL AND api_key IS NOT NULL
           LIMIT 1`,
          [tenant_id]
        );
        if (branchRes.rows.length > 0) {
          webhookSecret = branchRes.rows[0].api_key;
        } else if (provider === 'foodics' && !isProduction && process.env.FOODICS_WEBHOOK_SECRET) {
          webhookSecret = process.env.FOODICS_WEBHOOK_SECRET;
          logger.warn(`[DEV ONLY] Using global FOODICS_WEBHOOK_SECRET fallback for tenant ${tenant_id}`);
        }
      }

      // 2. Strict Fail-Closed Security Policy: Reject if no secret found
      if (!webhookSecret) {
        logger.error(`Webhook rejected: No POS integration secret configured for tenant ${tenant_id}`);
        return res.status(403).json({ error: 'POS integration secret not configured for tenant' });
      }

      // 3. Cryptographic Verification using timingSafeEqual
      if (!incomingSignature) {
        logger.error(`Webhook rejected: Missing signature header for tenant ${tenant_id}`);
        return res.status(403).json({ error: 'Missing signature header' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      const incomingBuffer = Buffer.from(incomingSignature, 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      if (
        incomingBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(incomingBuffer, expectedBuffer)
      ) {
        logger.error(`Webhook signature verification failed for tenant ${tenant_id}`);
        return res.status(403).json({ error: 'Invalid webhook signature' });
      }

      const payload = typeof req.body === 'string' || req.body instanceof Buffer ? JSON.parse(rawBody) : req.body;
      const eventHeader = req.headers[`x-${provider}-event`] || req.headers['x-webhook-event'];
      const eventType =
        (Array.isArray(eventHeader) ? eventHeader[0] : eventHeader) ||
        payload?.event ||
        'order.paid';
      const eventIdHeader = req.headers[`x-${provider}-event-id`] || req.headers['x-webhook-event-id'];
      const orderId = payload?.order?.id || payload?.invoice_id || payload?.id;
      const providerEventId =
        (Array.isArray(eventIdHeader) ? eventIdHeader[0] : eventIdHeader) ||
        payload?.event_id ||
        payload?.id ||
        (orderId ? `${eventType}:${orderId}` : null);

      // 4. Persist incoming webhook log with provider_event_id deduplication
      let logId: string;
      try {
        const logRes = await db.query(
          `INSERT INTO webhook_logs (tenant_id, pos_type, provider, provider_event_id, event_type, payload, status)
           VALUES ($1::uuid, $2, $3, $4, $5, $6, 'pending')
           RETURNING id`,
          [tenant_id, provider, provider, providerEventId, eventType, JSON.stringify(payload)]
        );
        logId = logRes.rows[0].id;
      } catch (dbErr: unknown) {
        if ((dbErr as { code?: string })?.code === '23505') {
          logger.info('Duplicate webhook event ignored', { tenant_id, providerEventId });
          return res.status(200).json({ status: 'duplicate_ignored' });
        }
        throw dbErr;
      }

      // 5. Delegate to BullMQ Queue
      const jobId =
        eventType === 'order.paid'
          ? `${provider}_${tenant_id}_${orderId || logId}`
          : `${provider}_${tenant_id}_${eventType}_${orderId || logId}`;

      try {
        await webhookQueue.add(
          'process-webhook',
          {
            tenantId: tenant_id,
            provider,
            eventType,
            payload: { ...payload, pos_type: payload?.pos_type || provider },
            logId,
          },
          { jobId }
        );
      } catch (queueErr: unknown) {
        // Delete pending dedup log so POS retries are not dropped as duplicates once Redis recovers.
        await db.query('DELETE FROM webhook_logs WHERE id = $1::uuid', [logId]).catch(() => {});
        const msg = queueErr instanceof Error ? queueErr.message : String(queueErr);
        logger.error(`Failed to enqueue ${provider} webhook:`, { error: msg, tenant_id, logId });
        return res.status(503).json({ error: 'Webhook queue temporarily unavailable' });
      }

      return res.status(200).json({ status: 'queued', log_id: logId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`Error handling ${provider} webhook:`, { error: msg });
      return res.status(500).json({ error: 'Internal server error processing webhook' });
    }
  }
}
