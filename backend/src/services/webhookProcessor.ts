import { Queue, Worker } from 'bullmq';

import { LoyaltyService } from './loyalty.js';
import db from '../config/db.js';
import { logger } from './logger.js';
import { getAdapter } from './pos/adapterRegistry.js';

// Define the Webhook Job interface
interface WebhookJobPayload {
  tenantId: string;
  eventType: string; // e.g., 'order.paid', 'order.closed'
  payload: any;
  logId: string;
}

// Initialize the Webhook Queue
const connectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const webhookQueue = new Queue<WebhookJobPayload, any, string>('foodics-webhooks', {
  connection: connectionOptions,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s, 40s...
    },
    removeOnComplete: true, // Keep clean
    removeOnFail: false, // Keep for inspection
  },
});

// Process Webhook Jobs
export const webhookWorker = new Worker<WebhookJobPayload>(
  'foodics-webhooks',
  async (job) => {
    const { tenantId, eventType, payload, logId } = job.data;
    logger.info(`Processing webhook job`, { jobId: job.id, eventType, tenantId });

    try {
      // Handle the event based on POS specs (payloads are POS-agnostic via adapters)
      if (eventType === 'order.paid' || eventType === 'order.closed') {
        const adapter = getAdapter(payload.pos_type);
        const order = adapter.parseOrder(payload);

        if (!order.customerPhone) {
          throw new Error('Customer phone number is missing in POS order payload');
        }
        if (!order.invoiceId) {
          throw new Error('Invoice id is missing in POS order payload');
        }

        const customerPhone = order.customerPhone;
        const totalAmount = order.totalAmount;
        const invoiceId = order.invoiceId;
        const branchLocationId = order.branchLocationId;

        // 1. Resolve or create customer (marks pos_identified_at; never auto-verifies OTP flag)
        const custRes = await db.query(
          `INSERT INTO customers (tenant_id, phone, name, is_verified, pos_identified_at)
           VALUES ($1::uuid, $2, $3, false, NOW())
           ON CONFLICT (tenant_id, phone) DO UPDATE SET
             name = COALESCE(NULLIF(customers.name, 'POS Customer'), EXCLUDED.name, customers.name),
             pos_identified_at = NOW(),
             deleted_at = NULL,
             updated_at = NOW()
           RETURNING id`,
          [tenantId, customerPhone, order.customerName || 'POS Customer']
        );
        const customerId: string = custRes.rows[0].id;

        // 2. Resolve Branch by location ID
        const branchRes = await db.query(
          'SELECT id FROM branches WHERE tenant_id = $1::uuid AND pos_location_id = $2 AND deleted_at IS NULL',
          [tenantId, branchLocationId]
        );

        let branchId: string;
        if (branchRes.rows.length === 0) {
          // Create default fallback branch if not registered
          const newBranchRes = await db.query(
            `INSERT INTO branches (tenant_id, name, pos_type, pos_location_id, is_active)
             VALUES ($1::uuid, $2, 'foodics', $3, true)
             RETURNING id`,
            [tenantId, order.branchName || `Branch ${branchLocationId}`, branchLocationId]
          );
          branchId = newBranchRes.rows[0].id;
        } else {
          branchId = branchRes.rows[0].id;
        }

        // 3. Award Points
        await LoyaltyService.earnPoints(
          tenantId,
          customerId,
          branchId,
          invoiceId,
          totalAmount,
          `Points earned from POS Order #${invoiceId}`
        );
      } else if (eventType === 'order.refunded') {
        const adapter = getAdapter(payload.pos_type);
        const order = adapter.parseOrder(payload);

        if (!order.invoiceId) {
          throw new Error('Invoice ID is missing for refund event');
        }

        await LoyaltyService.refundPoints(
          tenantId,
          order.invoiceId,
          `POS Webhook Refund #${order.invoiceId}`
        );
      }

      // Update log to processed
      await db.query(
        "UPDATE webhook_logs SET status = 'processed' WHERE id = $1",
        [logId]
      );
    } catch (error: any) {
      logger.error(`Failed processing job ${job.id}`, { error: (error as Error).message });
      
      // Update webhook log with failure status and error details
      await db.query(
        "UPDATE webhook_logs SET status = 'failed', error_message = $1 WHERE id = $2",
        [error.message, logId]
      );

      // Re-throw so BullMQ knows it failed and registers the retry/fail
      throw error;
    }
  },
  { connection: connectionOptions }
);

webhookWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed permanently`, { error: err.message });
});
