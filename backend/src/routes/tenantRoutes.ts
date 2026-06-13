import { Router } from 'express';
import { TenantController } from '../controllers/tenantController.js';
import { authenticateJWT } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

router.get('/public/:slug', TenantController.getTenantBySlug);
router.post('/', authenticateJWT, TenantController.createTenant);
router.get('/me', authenticateJWT, TenantController.getTenant);
router.patch('/me', authenticateJWT, TenantController.updateTenant);
router.post('/branches', authenticateJWT, validate(schemas.createBranch), TenantController.createBranch);
router.get('/branches', authenticateJWT, TenantController.getBranches);
router.post('/branches/:branch_id/regenerate-key', authenticateJWT, TenantController.regenerateBranchApiKey);

export default router;
