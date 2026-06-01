import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/stats', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getStats);
router.get('/customers', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getCustomers);
router.get('/rewards', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getRewards);
router.post('/rewards', authenticateJWT, requireRole(['owner', 'manager']), AdminController.createReward);
router.get('/branches', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getBranches);

export default router;
