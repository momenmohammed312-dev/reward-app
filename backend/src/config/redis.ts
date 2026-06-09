import { createClient } from 'redis';
import dotenv from 'dotenv';
import { logger } from '../services/logger.js';

dotenv.config();

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis max reconnect attempts reached');
        return new Error('Redis max reconnect attempts reached');
      }
      return Math.min(retries * 200, 5000);
    },
  },
});

redisClient.on('error', (err) => logger.error('Redis Client Error', { error: err.message }));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
      logger.info('Connected to Redis successfully');
    } catch (err) {
      logger.warn('Redis not available, continuing without it', { error: (err as Error).message });
    }
  }
};

export default redisClient;
