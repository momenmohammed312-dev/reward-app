import { Router } from 'express';
import db from '../config/db.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';
const router = Router();

// GET /api/admin/stats
router.get('/stats', authenticateJWT, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const [customersRes, pointsRes, rewardsRes] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM customers WHERE tenant_id = $1', [tenantId]),
      db.query("SELECT COALESCE(SUM(points),0) as total FROM wallet_ledger WHERE tenant_id = $1 AND type = 'earned'", [tenantId]),
      db.query('SELECT COUNT(*) as total FROM redemptions WHERE tenant_id = $1', [tenantId]),
    ]);
    res.json({
      totalCustomers: parseInt(customersRes.rows[0].total),
      totalPointsIssued: parseInt(pointsRes.rows[0].total),
      totalRedemptions: parseInt(rewardsRes.rows[0].total),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/customers
router.get('/customers', authenticateJWT, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const search = req.query.search || '';

    const result = await db.query(
      `SELECT c.id, c.name, c.phone, c.tier, c.created_at,
              COALESCE(cs.points_balance, 0) as balance,
              COALESCE(cs.total_earned, 0) as total_earned
       FROM customers c
       LEFT JOIN customer_summary cs ON c.id = cs.id
       WHERE c.tenant_id = $1
         AND ($4 = '' OR c.name ILIKE $4 OR c.phone ILIKE $4)
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset, search ? `%${search}%` : '']
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin customers error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/rewards
router.post('/rewards', authenticateJWT, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const { title, description, points_required, category, expiry_days } = req.body;
    if (!title || !points_required) {
      return res.status(400).json({ error: 'Missing fields', message: 'title and points_required are required' });
    }
    const result = await db.query(
      `INSERT INTO rewards (tenant_id, name, description, points_required, category, expiry_days, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [tenantId, title, description || '', points_required, category || 'general', expiry_days || 30]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create reward error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/admin/branches
router.get('/branches', authenticateJWT, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const result = await db.query(
      'SELECT id, name, pos_type, pos_location_id, api_key, is_active, created_at FROM branches WHERE tenant_id = $1 ORDER BY created_at ASC',
      [tenantId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Admin branches error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
