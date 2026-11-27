import { Queue, Worker } from 'bullmq';

import { LoyaltyService } from './loyalty.js';
import db from '../config/db.js';
import { getBullMQConnection, isRedisReady } from '../config/redis.js';
import { logger } from './logger.js';
import { getAdapter } from './pos/adapterRegistry.js';
import { CustomApiAdapter } from './pos/customApiAdapter.js';

// Define the Webhook Job interface
interface WebhookJobPayload {
  tenantId: string;
  provider?: string;
  eventType: string; // e.g., 'order.paid', 'order.closed'
  payload: any;
  logId: string;
}

const VALID_POS_ENUMS = new Set(['foodics', 'square', 'toast', 'custom_api', 'manual']);

let webhookQueueInstance: Queue<WebhookJobPayload, any, string> | null = null;
let webhookWorkerInstance: Worker<WebhookJobPayload> | null = null;

/**
 * Returns the lazy BullMQ webhook queue when Redis is connected.
 */
export function getWebhookQueue(): Queue<WebhookJobPayload, any, string> | null {
  if (!isRedisReady()) return null;
  if (!webhookQueueInstance) {
    webhookQueueInstance = new Queue<WebhookJobPayload, any, string>('foodics-webhooks', {
      connection: getBullMQConnection(),
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
    webhookQueueInstance.on('error', (err) => {
      logger.error('Webhook queue error', { error: err.message });
    });
  }
  return webhookQueueInstance;
}

// Lazy proxy preserved for existing callers and unit-test mocks.
export const webhookQueue = {
  async add(name: string, data: WebhookJobPayload, opts?: { jobId?: string }) {
    const queue = getWebhookQueue();
    if (!queue) {
      throw new Error('Redis queue unavailable');
    }
    return queue.add(name, data, opts);
  },
  async close() {
    if (webhookQueueInstance) {
      await webhookQueueInstance.close();
      webhookQueueInstance = null;
    }
  },
};

/**
 * Starts the BullMQ Foodics webhook worker (called explicitly after connectRedis()).
 */
export function startWebhookWorker(): Worker<WebhookJobPayload> | null {
  if (!isRedisReady()) return null;
  if (webhookWorkerInstance) return webhookWorkerInstance;

  webhookWorkerInstance = new Worker<WebhookJobPayload>(
    'foodics-webhooks',
    async (job) => {
      const { tenantId, provider, eventType, payload, logId } = job.data;
      const effectiveProvider = (provider || payload?.pos_type || 'foodics').toLowerCase();
      logger.info(`Processing webhook job`, { jobId: job.id, eventType, tenantId, provider: effectiveProvider });

      try {
        if (eventType === 'order.paid' || eventType === 'order.closed') {
          const adapter = getAdapter(effectiveProvider);
          let excludedKeywords: string[] | undefined;
          if (adapter instanceof CustomApiAdapter) {
            const kwRes = await db.query(
              'SELECT excluded_item_keywords FROM tenants WHERE id = $1::uuid',
              [tenantId]
            );
            excludedKeywords = kwRes.rows[0]?.excluded_item_keywords;
          }
          const order =
            adapter instanceof CustomApiAdapter
              ? adapter.parseOrder(payload, excludedKeywords)
              : adapter.parseOrder(payload);

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
          const fallbackPosType = VALID_POS_ENUMS.has(effectiveProvider) ? effectiveProvider : 'custom_api';
          // Create default fallback branch if not registered
          const newBranchRes = await db.query(
            `INSERT INTO branches (tenant_id, name, pos_type, pos_location_id, is_active)
             VALUES ($1::uuid, $2, $3::pos_type, $4, true)
             RETURNING id`,
            [tenantId, order.branchName || `Branch ${branchLocationId || 'Main'}`, fallbackPosType, branchLocationId || null]
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
        const adapter = getAdapter(effectiveProvider);
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
  { connection: getBullMQConnection() }
  );

  webhookWorkerInstance.on('error', (err) => {
    logger.error('Webhook worker error', { error: err.message });
  });

  webhookWorkerInstance.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed permanently`, { error: err.message });
  });

  return webhookWorkerInstance;
}

/**
 * Gracefully stops the webhook worker if running.
 */
export async function stopWebhookWorker(): Promise<void> {
  if (webhookWorkerInstance) {
    await webhookWorkerInstance.close();
    webhookWorkerInstance = null;
  }
}
