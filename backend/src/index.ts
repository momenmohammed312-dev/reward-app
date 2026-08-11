import app from './app.js';
import db from './config/db.js';
import { connectRedis } from './config/redis.js';
import { ExpiryService } from './services/expiry.js';
import { logger } from './services/logger.js';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    await db.query('SELECT NOW()');
    logger.info('Connected to PostgreSQL Database successfully');

    const redisConnected = await connectRedis();
    if (!redisConnected) {
      logger.warn('Starting without Redis – caching and queue features may be limited');
    }

    app.listen(PORT, () => {
      logger.info(`Backend server running on port ${PORT}`);
    });

    ExpiryService.startScheduler();
  } catch (error) {
    logger.error('Failed to start backend server', { error: (error as Error).message });
    process.exit(1);
  }
};

startServer();
