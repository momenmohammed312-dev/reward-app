import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { logger } from '../services/logger.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set');
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenant_id: string;
    email: string;
    role: string;
    branch_id?: string | null;
  };
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden', message: 'Invalid or expired token' });
      }

      req.user = {
        id: decoded.id,
        tenant_id: decoded.tenant_id,
        email: decoded.email,
        role: decoded.role,
        branch_id: decoded.branch_id || null,
      };
      
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized', message: 'Authorization token is required' });
  }
};

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
