import { Request, Response } from 'express';
import db from '../config/db.js';
import { webhookQueue } from '../services/webhookProcessor.js';

export class WebhookController {
  /**
   * Handle incoming Webhook from Foodics POS
   * Goal: Immediate response (<500ms), delegation to BullMQ worker queue.
   */
  static async handleFoodicsWebhook(req: Request, res: Response) {
    try {
      // Foodics sends client-id or authorization header for verification.
      // For multi-tenant, we resolve tenant via branch api-key or request header.
      // Let's assume tenant-id is passed as a URL parameter /api/webhooks/foodics/:tenant_id
      // Or parsed from specialized custom headers.
      const { tenant_id } = req.params;
      const eventType = req.headers['x-foodics-event'] as string || req.body.event || 'order.paid';
      const payload = req.body;

      if (!tenant_id) {
        return res.status(400).json({ error: 'Missing tenant identifier' });
      }

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
      console.error('Webhook reception error:', error);
      res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
  }
}
