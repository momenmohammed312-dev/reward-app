import { Queue, Worker, QueueEvents } from 'bullmq';
import redisClient from '../config/redis.js';
import { LoyaltyService } from './loyalty.js';
import db from '../config/db.js';
import { logger } from './logger.js';

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
      // Handle the event based on Foodics specs
      if (eventType === 'order.paid' || eventType === 'order.closed') {
        const order = payload.order || payload;
        const rawPhone = order.customer?.phone || '';
        const customerPhone = rawPhone.replace(/^\+?2?0?/, '0').replace(/\s+/g, '').slice(-11);
        const totalAmount = Number(order.total_price || order.total || 0);
        const invoiceId = order.id || order.number;
        const branchLocationId = order.branch?.id || order.branch_id;

        if (!customerPhone) {
          throw new Error('Customer phone number is missing in Foodics order payload');
        }

        // 1. Resolve Customer by Phone (create if doesn't exist under this tenant)
        let customerRes = await db.query(
          'SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2',
          [tenantId, customerPhone]
        );

        let customerId: string;
        if (customerRes.rows.length === 0) {
          const newCustRes = await db.query(
            `INSERT INTO customers (tenant_id, phone, name, is_verified)
             VALUES ($1, $2, $3, true)
             RETURNING id`,
            [tenantId, customerPhone, order.customer?.name || 'Foodics Customer']
          );
          customerId = newCustRes.rows[0].id;
        } else {
          customerId = customerRes.rows[0].id;
        }

        // 2. Resolve Branch by location ID
        let branchRes = await db.query(
          'SELECT id FROM branches WHERE tenant_id = $1 AND pos_location_id = $2',
          [tenantId, branchLocationId]
        );

        let branchId: string;
        if (branchRes.rows.length === 0) {
          // Create default fallback branch if not registered
          const newBranchRes = await db.query(
            `INSERT INTO branches (tenant_id, name, pos_type, pos_location_id, is_active)
             VALUES ($1, $2, 'foodics', $3, true)
             RETURNING id`,
            [tenantId, order.branch?.name || `Branch ${branchLocationId}`, branchLocationId]
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
          `Points earned from Foodics Order #${invoiceId}`
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
