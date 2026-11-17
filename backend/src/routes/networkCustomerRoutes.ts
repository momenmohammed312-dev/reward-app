import { Router } from 'express';
import { NetworkController } from '../controllers/networkController.js';
import { authenticateJWT } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

// ─── PHASE 2 & 3: RATES PREVIEW & CROSS-TENANT REDEMPTION ───
router.get('/:id/rates', authenticateJWT, NetworkController.getNetworkRates);

router.post(
  '/:id/convert-preview',
  authenticateJWT,
  validate(schemas.previewConversion),
  NetworkController.previewCrossConversion
);

router.post(
  '/:id/redeem',
  authenticateJWT,
  validate(schemas.crossTenantRedeem),
  NetworkController.crossTenantRedeem
);

// ─── PHASE 5: UNIFIED NETWORK CUSTOMER IDENTITY ─────────────
router.post(
  '/:id/link/request-otp',
  authenticateJWT,
  authLimiter,
  validate(schemas.networkLinkRequestOtp),
  NetworkController.requestNetworkLinkOtp
);

router.post(
  '/:id/link/verify-otp',
  authenticateJWT,
  authLimiter,
  validate(schemas.networkLinkVerifyOtp),
  NetworkController.verifyAndLinkNetworkCustomer
);

router.get('/:id/wallet', authenticateJWT, NetworkController.getUnifiedNetworkWallet);

export default router;
