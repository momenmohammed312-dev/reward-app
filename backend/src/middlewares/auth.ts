import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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
