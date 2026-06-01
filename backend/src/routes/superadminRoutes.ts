import { Router } from 'express';
import { SuperAdminController } from '../controllers/superadminController.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/tenants', authenticateJWT, requireRole(['superadmin']), SuperAdminController.getAllTenants);
router.patch('/tenants/:id', authenticateJWT, requireRole(['superadmin']), SuperAdminController.toggleTenantStatus);
router.get('/webhook-logs', authenticateJWT, requireRole(['superadmin']), SuperAdminController.getWebhookLogs);
router.get('/stats', authenticateJWT, requireRole(['superadmin']), SuperAdminController.getGlobalStats);

export default router;
