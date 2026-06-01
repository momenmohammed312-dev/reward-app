import { Router, Request, Response } from 'express';
import db from '../config/db.js';

const router = Router();

// GET /api/rewards?tenant_id=xxx
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenant_id as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenant_id query parameter is required' });
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
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY required_points ASC
    `, [tenantId]);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Public rewards error:', err);
    res.status(500).json({ error: 'Failed to fetch rewards', message: err.message });
  }
});

export default router;
