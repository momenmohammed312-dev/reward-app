import { Router } from 'express';
import { NetworkController } from '../controllers/networkController.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';

const router = Router();

// ─── MY NETWORKS ────────────────────────────────────────────
router.get(
  '/me/networks',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  NetworkController.getMyNetworks
);

router.get(
  '/me/networks/:id',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  NetworkController.getMyNetworkDetails
);

router.delete(
  '/me/networks/:id/leave',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  NetworkController.leaveNetwork
);

export default router;
