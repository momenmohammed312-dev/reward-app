import { createClient, type RedisClientType } from 'redis';
import dotenv from 'dotenv';
import { logger } from '../services/logger.js';

dotenv.config();

// ---------------------------------------------------------------------------
// Redis is fully optional. If it is unavailable the app runs without it.
// We set reconnectStrategy: false so the client makes exactly ONE connection
// attempt and then stops — no retry loop, no raw stderr spam.
// ---------------------------------------------------------------------------

let redisClient: RedisClientType | null = null;
let _redisAvailable = false;

function createRedisClient(): RedisClientType {
  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      // Disable automatic reconnection entirely.
      // connectRedis() handles the single startup attempt; if Redis comes
      // back online later you can call connectRedis() again manually.
      reconnectStrategy: false,
      // Fail fast: don't hang the startup sequence waiting on a dead server.
      connectTimeout: 3000,
    },
  }) as RedisClientType;

  // Attach error listener immediately so Node.js doesn't throw an
  // unhandled 'error' event. The connect() promise already rejects on
  // failure, so this handler is mainly a safety net for post-connect errors.
  client.on('error', (err: Error) => {
    // Use err.code when message is empty (node-redis v4 quirk).
    const detail = err.message || (err as any).code || String(err);
    logger.warn('Redis client error (non-fatal)', { error: detail });
  });

  return client;
}

/**
 * Attempts a single connection to Redis.
 *
 * - Returns `true`  if Redis is available.
 * - Returns `false` if Redis is not available (app continues without it).
 *
 * This is intentionally NON-FATAL. Never call process.exit() here.
 */
export const connectRedis = async (): Promise<boolean> => {
  try {
    redisClient = createRedisClient();
    await redisClient.connect();
    _redisAvailable = true;
    logger.info('Connected to Redis successfully');
    return true;
  } catch (err) {
    // Destroy the broken client so we don't hold an open socket.
    if (redisClient) {
      try { await redisClient.disconnect(); } catch { /* ignore */ }
      redisClient = null;
    }
    _redisAvailable = false;

    const detail = (err as Error).message || (err as any).code || String(err);
    logger.warn('Redis not available – app will continue without it', { error: detail });
    return false;
  }
};

/** Returns true only when Redis is connected and ready. */
export const isRedisReady = (): boolean => _redisAvailable && redisClient !== null && redisClient.isOpen;

/**
 * Returns the Redis client.
 * Always check `isRedisReady()` before calling this, or guard with a null-check.
 *
 * @example
 * if (isRedisReady()) {
 *   await getRedisClient()!.set('key', 'value');
 * }
 */
export const getRedisClient = (): RedisClientType | null => redisClient;

// Legacy default export kept for backward-compatibility.
// Prefer getRedisClient() for new code so callers are forced to handle null.
export default {
  get isOpen() { return isRedisReady(); },
  // Proxy the most-used commands; callers that need the full client should use getRedisClient().
  get(key: string)                         { return redisClient?.get(key) ?? Promise.resolve(null); },
  set(key: string, value: string, options?: any) { return redisClient?.set(key, value, options) ?? Promise.resolve(null); },
  del(key: string)                         { return redisClient?.del(key) ?? Promise.resolve(0); },
  exists(key: string)                      { return redisClient?.exists(key) ?? Promise.resolve(0); },
  expire(key: string, seconds: number)     { return redisClient?.expire(key, seconds) ?? Promise.resolve(false); },
  incr(key: string)                        { return redisClient?.incr(key) ?? Promise.resolve(0); },
};
