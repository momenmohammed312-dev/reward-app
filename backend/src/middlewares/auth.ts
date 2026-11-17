import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { getRedisClient, isRedisReady } from '../config/redis.js';
import { logger } from '../services/logger.js';

const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}
const JWT_SECRET: string = rawJwtSecret;

export interface AuthenticatedUser {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  branch_id?: string | null;
  phone?: string;
  jti?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, async (err, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden', message: 'Invalid or expired token' });
      }

      try {
        if (decoded?.jti && isRedisReady()) {
          const redisClient = getRedisClient();
          if (redisClient) {
            const isBlacklisted = await redisClient.get(`blacklist:token:${decoded.jti}`);
            if (isBlacklisted) {
              return res.status(401).json({ error: 'Unauthorized', message: 'Token has been revoked' });
            }
          }
        }
      } catch (redisErr: unknown) {
        logger.warn('Redis blacklist check failed', {
          error: redisErr instanceof Error ? redisErr.message : String(redisErr),
        });
      }

      req.user = {
        id: decoded.id,
        tenant_id: decoded.tenant_id,
        email: decoded.email,
        role: decoded.role,
        branch_id: decoded.branch_id || null,
        phone: decoded.phone,
        jti: decoded.jti,
      };

      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized', message: 'Authorization token is required' });
  }
};

/**
 * Verifies JWT token and checks for token revocation in Redis.
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as AuthenticatedUser;

    if (decoded.jti && isRedisReady()) {
      const redisClient = getRedisClient();
      if (redisClient) {
        const isBlacklisted = await redisClient.get(`blacklist:token:${decoded.jti}`);
        if (isBlacklisted) {
          return res.status(401).json({ error: 'Token has been revoked' });
        }
      }
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid or forged token' });
  }
}

/**
 * Enforces branch-level authorization for cashiers.
 */
export function requireBranchAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role === 'owner' || req.user.role === 'manager' || req.user.role === 'superadmin') {
    return next();
  }

  const targetBranchId = req.params.branch_id || req.body?.branch_id;
  if (req.user.role === 'cashier' && targetBranchId && req.user.branch_id !== targetBranchId) {
    return res.status(403).json({ error: 'Cashier cannot perform actions outside their assigned branch' });
  }

  next();
}

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to access this resource' });
    }

    next();
  };
};

export const requireSubscription = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role === 'superadmin') {
    return next();
  }

  db.query(
    `SELECT t.is_active, s.status, s.current_period_end
     FROM tenants t
     LEFT JOIN subscriptions s ON s.tenant_id = t.id
     WHERE t.id = $1::uuid`,
    [req.user.tenant_id]
  ).then(result => {
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant = result.rows[0];

    if (!tenant.is_active) {
      return res.status(403).json({ error: 'Account suspended', message: 'Your account has been suspended' });
    }

    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(tenant.status)) {
      return res.status(403).json({ error: 'Subscription inactive', message: 'Your subscription is no longer active' });
    }

    if (tenant.current_period_end && new Date(tenant.current_period_end) < new Date()) {
      return res.status(403).json({ error: 'Subscription expired', message: 'Your subscription period has ended' });
    }

    next();
  }).catch((err) => {
    logger.error('requireSubscription error:', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to verify subscription' });
  });
};
