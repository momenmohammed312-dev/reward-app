import { Request, Response } from 'express';
import crypto from 'crypto';
import db from '../config/db.js';
import { webhookQueue } from '../services/webhookProcessor.js';
import { logger } from '../services/logger.js';

export class WebhookController {
  /**
   * Handle incoming Webhook from Foodics POS.
   * Enforces strict fail-closed signature verification and credential-based resolution.
   */
  static async handleFoodicsWebhook(req: Request, res: Response) {
    try {
      const { tenant_id } = req.params;
      if (!tenant_id) {
        return res.status(400).json({ error: 'Missing tenant identifier' });
      }

      const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const signatureHeader = req.headers['x-foodics-signature'] || '';
      const incomingSignature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

      const isProduction = process.env.NODE_ENV === 'production';

      // 1. Resolve integration secret explicitly from pos_integrations table
      let webhookSecret: string | null = null;

      const integrationRes = await db.query(
        `SELECT webhook_secret FROM pos_integrations
         WHERE tenant_id = $1::uuid AND provider = 'foodics' AND is_active = true
         LIMIT 1`,
        [tenant_id]
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
        } else if (!isProduction && process.env.FOODICS_WEBHOOK_SECRET) {
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
      const eventType = (req.headers['x-foodics-event'] as string) || payload?.event || 'order.paid';
      const eventIdHeader = req.headers['x-foodics-event-id'];
      const providerEventId =
        (Array.isArray(eventIdHeader) ? eventIdHeader[0] : eventIdHeader) ||
        payload?.event_id ||
        payload?.id ||
        (payload?.order?.id ? `${eventType}:${payload.order.id}` : null);

      // 4. Persist incoming webhook log with provider_event_id deduplication
      let logId: string;
      try {
        const logRes = await db.query(
          `INSERT INTO webhook_logs (tenant_id, pos_type, provider, provider_event_id, event_type, payload, status)
           VALUES ($1::uuid, 'foodics', 'foodics', $2, $3, $4, 'pending')
           RETURNING id`,
          [tenant_id, providerEventId, eventType, JSON.stringify(payload)]
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
      const orderId = payload?.order?.id;
      const jobId =
        eventType === 'order.paid'
          ? `foodics_${tenant_id}_${orderId || logId}`
          : `foodics_${tenant_id}_${eventType}_${orderId || logId}`;

      await webhookQueue.add(
        'process-webhook',
        {
          tenantId: tenant_id,
          eventType,
          payload,
          logId,
        },
        { jobId }
      );

      return res.status(200).json({ status: 'queued', log_id: logId });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Error handling Foodics webhook:', { error: msg });
      return res.status(500).json({ error: 'Internal server error processing webhook' });
    }
  }
}
