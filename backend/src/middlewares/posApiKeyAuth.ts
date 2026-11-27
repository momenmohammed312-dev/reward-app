import { Request, Response, NextFunction } from 'express';
import db from '../config/db.js';
import { logger } from '../services/logger.js';

export interface PosContext {
  tenantId: string;
  branchId: string;
  branchName: string;
  posType: string;
}

export interface PosAuthenticatedRequest extends Request {
  posContext?: PosContext;
}

function extractApiKey(req: Request): string {
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && xApiKey.trim()) {
    return xApiKey.trim();
  }
  const auth = req.headers.authorization;
  if (typeof auth === 'string' && auth.toLowerCase().startsWith('apikey ')) {
    return auth.slice(7).trim();
  }
  return '';
}

/**
 * Authenticates synchronous POS terminal requests via branch `api_key`.
 * Resolves tenant and branch context exclusively from the key — never from request body.
 */
export async function authenticatePosApiKey(
  req: PosAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing x-api-key header' });
  }

  try {
    const result = await db.query(
      `SELECT b.id AS branch_id, b.tenant_id, b.name AS branch_name, b.pos_type, t.is_active AS tenant_active
       FROM branches b
       JOIN tenants t ON b.tenant_id = t.id
       WHERE b.api_key = $1
         AND b.is_active = true
         AND b.deleted_at IS NULL
       LIMIT 1`,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or inactive branch API key' });
    }

    const row = result.rows[0];
    if (!row.tenant_active) {
      return res.status(403).json({ error: 'Forbidden', message: 'Tenant account is suspended' });
    }

    req.posContext = {
      tenantId: row.tenant_id,
      branchId: row.branch_id,
      branchName: row.branch_name,
      posType: row.pos_type,
    };
    return next();
  } catch (err: unknown) {
    logger.error('POS API key auth error', { error: err instanceof Error ? err.message : String(err) });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
