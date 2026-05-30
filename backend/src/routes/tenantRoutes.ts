import { Router } from 'express';
import { TenantController } from '../controllers/tenantController.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';

const router = Router();

// Create tenant (Public signup / Super Admin)
router.post('/', TenantController.createTenant);

// Get current tenant configuration
router.get('/me', authenticateJWT, TenantController.getTenant);

// Create branch
router.post(
  '/branches',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  TenantController.createBranch
);

// Get all branches of tenant
router.get('/branches', authenticateJWT, TenantController.getBranches);

// Regenerate API Key for branch integration
router.post(
  '/branches/:branch_id/regenerate-key',
  authenticateJWT,
  requireRole(['owner']),
  TenantController.regenerateBranchApiKey
);

export default router;
