import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

router.get('/stats', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getStats);
router.get('/customers', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getCustomers);
router.get('/rewards', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getRewards);
router.post('/rewards', authenticateJWT, requireRole(['owner', 'manager']), validate(schemas.createReward), AdminController.createReward);
router.get('/branches', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getBranches);
router.post('/branches', authenticateJWT, requireRole(['owner', 'manager']), AdminController.createBranch);
router.patch('/branches/:id', authenticateJWT, requireRole(['owner', 'manager']), AdminController.updateBranch);
router.delete('/branches/:id', authenticateJWT, requireRole(['owner', 'manager']), AdminController.deleteBranch);

router.patch('/customers/:id', authenticateJWT, requireRole(['owner', 'manager']), AdminController.updateCustomer);
router.delete('/customers/:id', authenticateJWT, requireRole(['owner', 'manager']), AdminController.deleteCustomer);

router.patch('/rewards/:id', authenticateJWT, requireRole(['owner', 'manager']), AdminController.updateReward);
router.delete('/rewards/:id', authenticateJWT, requireRole(['owner', 'manager']), AdminController.deleteReward);

router.get('/stats/chart', authenticateJWT, requireRole(['owner', 'manager']), AdminController.getStatsChart);

export default router;
