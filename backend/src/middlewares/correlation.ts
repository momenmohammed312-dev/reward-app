import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface CorrelatedRequest extends Request {
  correlationId?: string;
}

/**
 * Attaches a unique correlation ID to every incoming request.
 */
export function correlationMiddleware(req: CorrelatedRequest, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    (req.headers['x-request-id'] as string) ||
    crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  next();
}
