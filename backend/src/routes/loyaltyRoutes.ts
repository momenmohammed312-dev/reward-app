import { Router } from 'express';
import { LoyaltyController } from '../controllers/loyaltyController.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

// Customer specific loyalty routes
router.get('/profile', authenticateJWT, LoyaltyController.getCustomerProfile);
router.patch('/profile', authenticateJWT, validate(schemas.updateProfile), LoyaltyController.updateCustomerProfile);
router.get('/history', authenticateJWT, LoyaltyController.getLedgerHistory);
router.post('/redeem', authenticateJWT, validate(schemas.redeemReward), LoyaltyController.customerRedeemReward);

// Admin / Cashier specific loyalty routes
router.post(
  '/manual-earn',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  validate(schemas.manualEarn),
  LoyaltyController.adminEarnPointsManual
);

router.post(
  '/refund',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  validate(schemas.refundTransaction),
  LoyaltyController.adminRefundTransaction
);

router.post(
  '/adjust',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  validate(schemas.adjustPoints),
  LoyaltyController.adminAdjustPoints
);

router.post(
  '/process-redemption',
  authenticateJWT,
  requireRole(['owner', 'manager', 'cashier']),
  validate(schemas.processRedemption),
  LoyaltyController.cashierProcessRedemption
);

export default router;
