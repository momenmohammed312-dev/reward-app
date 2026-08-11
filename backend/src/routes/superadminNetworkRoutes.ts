import { Router } from 'express';
import { NetworkController } from '../controllers/networkController.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

// ─── NETWORK CRUD ───────────────────────────────────────────
router.post(
  '/',
  authenticateJWT,
  requireRole(['superadmin']),
  validate(schemas.createNetwork),
  NetworkController.createNetwork
);

router.get(
  '/',
  authenticateJWT,
  requireRole(['superadmin']),
  NetworkController.getAllNetworks
);

router.get(
  '/:id',
  authenticateJWT,
  requireRole(['superadmin']),
  NetworkController.getNetworkById
);

router.patch(
  '/:id',
  authenticateJWT,
  requireRole(['superadmin']),
  validate(schemas.updateNetwork),
  NetworkController.updateNetwork
);

router.delete(
  '/:id',
  authenticateJWT,
  requireRole(['superadmin']),
  NetworkController.deactivateNetwork
);

// ─── MEMBER MANAGEMENT ──────────────────────────────────────
router.post(
  '/:id/members',
  authenticateJWT,
  requireRole(['superadmin']),
  validate(schemas.addNetworkMember),
  NetworkController.addMember
);

router.delete(
  '/:id/members/:tenantId',
  authenticateJWT,
  requireRole(['superadmin']),
  NetworkController.removeMember
);

router.patch(
  '/:id/members/:tenantId/suspend',
  authenticateJWT,
  requireRole(['superadmin']),
  NetworkController.suspendMember
);

export default router;
