import { Router, Request, Response } from 'express';
import db from '../config/db.js';
import { getRedisClient, isRedisReady } from '../config/redis.js';
import { logger } from '../services/logger.js';

const router = Router();

/**
 * Liveness Probe: Checks if the HTTP server process is running.
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Readiness Probe: Checks connectivity to PostgreSQL and Redis.
 * Returns 200 when ready to accept traffic, 503 if any critical dependency fails.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: 'up' | 'down'; latencyMs?: number; error?: string }> = {};
  let isReady = true;

  // 1. PostgreSQL Check
  const dbStart = Date.now();
  try {
    await db.query('SELECT 1');
    checks.database = {
      status: 'up',
      latencyMs: Date.now() - dbStart,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    isReady = false;
    checks.database = {
      status: 'down',
      error: msg,
    };
    logger.error('Readiness check failed: Database unreachable', { error: msg });
  }

  // 2. Redis Check (guarded with isRedisReady per config/redis.ts)
  const redisStart = Date.now();
  try {
    const redisClient = isRedisReady() ? getRedisClient() : null;
    if (redisClient) {
      const pong = await redisClient.ping();
      if (pong === 'PONG') {
        checks.redis = {
          status: 'up',
          latencyMs: Date.now() - redisStart,
        };
      } else {
        throw new Error(`Unexpected Redis ping response: ${pong}`);
      }
    } else {
      throw new Error('Redis client instance not connected');
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    isReady = false;
    checks.redis = {
      status: 'down',
      error: msg,
    };
    logger.error('Readiness check failed: Redis unreachable', { error: msg });
  }

  const statusCode = isReady ? 200 : 503;
  return res.status(statusCode).json({
    status: isReady ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
  });
});

export default router;
