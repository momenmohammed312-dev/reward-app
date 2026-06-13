import { Request, Response } from 'express';
import db from '../config/db.js';
import { webhookQueue } from '../services/webhookProcessor.js';
import crypto from 'crypto';
import { logger } from '../services/logger.js';

export class WebhookController {
  /**
   * Handle incoming Webhook from Foodics POS
   * Goal: Immediate response (<500ms), delegation to BullMQ worker queue.
   */
  static async handleFoodicsWebhook(req: Request, res: Response) {
    try {
      const { tenant_id } = req.params;
      if (!tenant_id) {
        return res.status(400).json({ error: 'Missing tenant identifier' });
      }

      const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

      const signatureHeader = req.headers['x-foodics-signature'] || '';
      const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

      // Try per-tenant HMAC key from branch API keys, fall back to global secret
      const branchRes = await db.query(
        `SELECT api_key FROM branches WHERE tenant_id = $1::uuid AND is_active = true AND api_key IS NOT NULL LIMIT 1`,
        [tenant_id]
      );
      const branchKey = branchRes.rows[0]?.api_key;
      const webhookSecret = branchKey || process.env.FOODICS_WEBHOOK_SECRET;

      if (webhookSecret) {
        const expectedSig = crypto
          .createHmac('sha256', webhookSecret)
          .update(rawBody)
          .digest('hex');

        if (signature !== expectedSig) {
          logger.warn('[Webhook] Invalid Foodics signature. Rejecting request.');
          return res.status(401).json({ error: 'Invalid signature' });
        }
      } else {
        logger.warn('[Webhook] No HMAC secret configured — skipping signature check');
      }

      const payload = typeof req.body === 'string' || req.body instanceof Buffer ? JSON.parse(rawBody) : req.body;
      const eventType = (req.headers['x-foodics-event'] as string) || payload.event || 'order.paid';

      // 1. Audit/Log the incoming raw webhook request immediately in PG
      const logRes = await db.query(
        `INSERT INTO webhook_logs (tenant_id, pos_type, event_type, payload, status)
         VALUES ($1, 'foodics', $2, $3, 'pending')
         RETURNING id`,
        [tenant_id, eventType, JSON.stringify(payload)]
      );

      const logId = logRes.rows[0].id;

      // 2. Push job to Redis/BullMQ queue for async processing
      await webhookQueue.add(`webhook-${logId}`, {
        tenantId: tenant_id,
        eventType,
        payload,
        logId,
      });

      // 3. Respond with HTTP 200/202 instantly to the POS gateway
      res.status(202).json({
        success: true,
        message: 'Webhook received and queued',
        log_id: logId,
      });
    } catch (error: any) {
      logger.error('Webhook reception error:', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
}
