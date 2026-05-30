import { Router } from 'express';
import { LoyaltyController } from '../controllers/loyaltyController.js';
import { authenticateJWT, requireRole } from '../middlewares/auth.js';

const router = Router();

// Customer specific loyalty routes
router.get('/profile', authenticateJWT, LoyaltyController.getCustomerProfile);
router.get('/history', authenticateJWT, LoyaltyController.getLedgerHistory);
router.post('/redeem', authenticateJWT, LoyaltyController.customerRedeemReward);

// Admin / Cashier specific loyalty routes
router.post(
  '/manual-earn',
  authenticateJWT,
  requireRole(['owner', 'manager']),
  LoyaltyController.adminEarnPointsManual
);

router.post(
  '/process-redemption',
  authenticateJWT,
  requireRole(['owner', 'manager', 'cashier']),
  LoyaltyController.cashierProcessRedemption
);

export default router;
