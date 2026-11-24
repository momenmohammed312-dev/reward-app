import type { Server } from 'http';
import app from './app.js';
import db from './config/db.js';
import { connectRedis, disconnectRedis } from './config/redis.js';
import { validateEnv } from './config/validateEnv.js';
import { logger } from './services/logger.js';
import { startWebhookWorker, stopWebhookWorker, webhookQueue } from './services/webhookProcessor.js';

const PORT = process.env.PORT || 4000;
let server: Server | null = null;
let shuttingDown = false;

const startServer = async () => {
  try {
    validateEnv();

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    await db.query('SELECT NOW()');
    logger.info('Connected to PostgreSQL Database successfully');

    const redisConnected = await connectRedis();
    if (!redisConnected) {
      logger.warn('Starting without Redis – caching and queue features may be limited');
    } else if (process.env.DISABLE_IN_PROCESS_WORKERS !== 'true') {
      startWebhookWorker();
      logger.info('In-process webhook worker started');
    }

    server = app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start backend server', { error: (error as Error).message });
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}, shutting down HTTP server gracefully...`);

  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
    }
    await stopWebhookWorker();
    await webhookQueue.close();
    await disconnectRedis();
    await db.pool.end();
    logger.info('HTTP server shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during HTTP server shutdown', { error: (err as Error).message });
    process.exit(1);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

startServer();
