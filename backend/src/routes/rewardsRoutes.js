import { Router } from 'express';
import db from '../config/db.js';
const router = Router();

// GET /api/rewards?tenant_id=xxx
router.get('/', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    if (!tenant_id) {
      return res.status(400).json({ error: 'Missing tenant_id query parameter' });
    }
    const result = await db.query(
      `SELECT id, name as title, description, points_required, category, expiry_days, image_url
       FROM rewards
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY points_required ASC`,
      [tenant_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
