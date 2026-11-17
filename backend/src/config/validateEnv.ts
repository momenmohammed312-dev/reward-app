import { logger } from '../services/logger.js';

export function validateEnv(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  const requiredVars = [
    'DATABASE_URL',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing: string[] = [];

  for (const key of requiredVars) {
    if ((key === 'REDIS_HOST' || key === 'REDIS_PORT') && process.env.REDIS_URL?.trim()) {
      continue;
    }
    if (!process.env[key] || process.env[key]?.trim() === '') {
      missing.push(key);
    }
  }

  // In production, enforce strict secrets presence with no weak defaults
  if (isProduction) {
    if (missing.length > 0) {
      const errorMsg = `[FATAL] Missing required production environment variables: ${missing.join(', ')}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (
      process.env.JWT_SECRET === 'm02_l0y4lty_s3cr3t_k3y_2026_#Secure!' ||
      process.env.JWT_SECRET?.includes('default')
    ) {
      const errorMsg = '[FATAL] Insecure default JWT_SECRET detected in production environment!';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }
  } else if (missing.length > 0) {
    logger.warn(
      `[WARN] Missing environment variables in development mode: ${missing.join(', ')}. Using defaults where applicable.`
    );
  }
}
