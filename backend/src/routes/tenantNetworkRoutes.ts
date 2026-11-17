import { Router } from 'express';
import { NetworkController } from '../controllers/networkController.js';
import { authenticateJWT, requireRole, requireSubscription } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validate.js';

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

// ─── PHASE 2: EXCHANGE RATES ────────────────────────────────
router.get(
  '/me/networks/:id/rates',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  NetworkController.getMyNetworkRates
);

router.put(
  '/me/networks/:id/rates',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  requireSubscription,
  validate(schemas.upsertExchangeRate),
  NetworkController.upsertMyExchangeRate
);

// ─── PHASE 4: TENANT POSITIONS & SETTLEMENTS ────────────────
router.get(
  '/me/networks/:id/positions',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  NetworkController.getMyNetPositions
);

router.get(
  '/me/networks/:id/settlements',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  NetworkController.getMyNetworkSettlements
);

export default router;
