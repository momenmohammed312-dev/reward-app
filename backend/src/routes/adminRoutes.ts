import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticateJWT, requireRole, requireSubscription } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

router.use(authenticateJWT, requireRole(['owner', 'manager']), requireSubscription);

router.get('/stats', AdminController.getStats);
router.get('/customers', AdminController.getCustomers);
router.get('/rewards', AdminController.getRewards);
router.post('/rewards', validate(schemas.createReward), AdminController.createReward);
router.get('/branches', AdminController.getBranches);
router.post('/branches', AdminController.createBranch);
router.patch('/branches/:id', AdminController.updateBranch);
router.delete('/branches/:id', AdminController.deleteBranch);

router.patch('/customers/:id', validate(schemas.updateCustomer), AdminController.updateCustomer);
router.delete('/customers/:id', AdminController.deleteCustomer);

router.patch('/rewards/:id', validate(schemas.updateReward), AdminController.updateReward);
router.delete('/rewards/:id', AdminController.deleteReward);

router.get('/staff', AdminController.getStaff);
router.patch('/users/:id/branch', validate(schemas.assignBranch), AdminController.assignBranchToUser);

router.get('/stats/chart', AdminController.getStatsChart);

export default router;
