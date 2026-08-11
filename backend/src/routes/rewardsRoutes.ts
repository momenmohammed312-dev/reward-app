import { Router, Request, Response } from 'express';
import db from '../config/db.js';
import { logger } from '../services/logger.js';
import { resolveTenantId } from '../helpers/resolveTenant.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/rewards?tenant_id=<uuid-or-slug>
// Public endpoint — no auth required.
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response) => {
  try {
    const raw = req.query.tenant_id as string | undefined;
    if (!raw) {
      return res.status(400).json({ error: 'tenant_id query parameter is required' });
    }

    // Resolve slug → UUID before touching any uuid-typed column.
    const tenantId = await resolveTenantId(raw);
    if (!tenantId) {
      return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
    }

    const result = await db.query(`
      SELECT id,
             name AS title,
             reward_type,
             required_points AS "pointsRequired",
             description,
             category,
             image_url AS "imageUrl",
             expiry_days AS "expiryDays"
      FROM rewards
      WHERE tenant_id = $1::uuid AND is_active = true AND deleted_at IS NULL
      ORDER BY required_points ASC
    `, [tenantId]);

    res.json(result.rows);
  } catch (err: any) {
    logger.error('Public rewards error', { error: (err as Error).message });
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

export default router;
