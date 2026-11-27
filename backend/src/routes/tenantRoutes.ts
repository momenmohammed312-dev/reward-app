import { Router } from 'express';
import { TenantController } from '../controllers/tenantController.js';
import { authenticateJWT, requireRole, requireSubscription } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

router.get('/public/:slug', TenantController.getTenantBySlug);
router.post('/', authenticateJWT, requireRole(['superadmin']), TenantController.createTenant);
router.get('/me', authenticateJWT, TenantController.getTenant);
router.patch('/me', authenticateJWT, requireRole(['owner', 'manager']), requireSubscription, validate(schemas.updateTenant), TenantController.updateTenant);
router.post('/branches', authenticateJWT, requireRole(['owner', 'manager']), requireSubscription, validate(schemas.createBranch), TenantController.createBranch);
router.get('/branches', authenticateJWT, TenantController.getBranches);
router.post('/branches/:branch_id/regenerate-key', authenticateJWT, requireRole(['owner', 'manager']), requireSubscription, TenantController.regenerateBranchApiKey);

export default router;
