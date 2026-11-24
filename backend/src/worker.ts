import db from './config/db.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { validateEnv } from './config/validateEnv.js';
import { ExpiryService } from './services/expiry.js';
import { logger } from './services/logger.js';
import { OutboxService } from './services/outbox.js';
import { ReconciliationService } from './services/reconciliation.js';
import { startSettlementWorker, stopSettlementWorker } from './services/networkSettlement.js';
import { startWebhookWorker, stopWebhookWorker, webhookQueue } from './services/webhookProcessor.js';

const OUTBOX_POLL_INTERVAL_MS = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '30000', 10);
const RECONCILIATION_INTERVAL_MS = parseInt(
  process.env.RECONCILIATION_INTERVAL_MS || String(24 * 60 * 60 * 1000),
  10
);

let outboxTimer: NodeJS.Timeout | null = null;
let reconciliationTimer: NodeJS.Timeout | null = null;

const startWorker = async () => {
  try {
    validateEnv();

    await db.query('SELECT NOW()');
    logger.info('[Worker] Connected to PostgreSQL Database successfully');

    const redisConnected = await connectRedis();
    if (!redisConnected) {
      logger.warn('[Worker] Starting without Redis — BullMQ workers paused until Redis is available');
    } else {
      startWebhookWorker();
      startSettlementWorker();
      logger.info('[Worker] BullMQ workers started (foodics-webhooks, network-settlements)');
    }

    // Dedicated single-instance scheduler (avoids duplicate PM2 cluster runs)
    ExpiryService.startScheduler();

    outboxTimer = setInterval(async () => {
      try {
        await OutboxService.processPendingEvents(20);
      } catch (err) {
        logger.error('[Worker] Outbox polling cycle failed', {
          error: (err as Error).message,
        });
      }
    }, OUTBOX_POLL_INTERVAL_MS);

    reconciliationTimer = setInterval(async () => {
      try {
        await ReconciliationService.runAudit();
      } catch (err) {
        logger.error('[Worker] Scheduled reconciliation audit failed', {
          error: (err as Error).message,
        });
      }
    }, RECONCILIATION_INTERVAL_MS);

    logger.info('[Worker] Background worker process initialized successfully');
  } catch (error) {
    logger.error('[Worker] Failed to initialize background worker', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
};

let shuttingDown = false;

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`[Worker] Received ${signal}, shutting down gracefully...`);
  if (outboxTimer) {
    clearInterval(outboxTimer);
    outboxTimer = null;
  }
  if (reconciliationTimer) {
    clearInterval(reconciliationTimer);
    reconciliationTimer = null;
  }
  ExpiryService.stopScheduler();

  try {
    await stopWebhookWorker();
    await stopSettlementWorker();
    await webhookQueue.close();
    await disconnectRedis();
    await db.pool.end();
    logger.info('[Worker] Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('[Worker] Error during graceful shutdown', { error: (err as Error).message });
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

startWorker();
