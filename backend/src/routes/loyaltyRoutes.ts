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
/**
 * @swagger
 * /api/loyalty/customer-lookup:
 *   get:
 *     summary: Instant lookup of a customer by membership card_number or Egyptian phone
 *     tags: [Loyalty]
 *     responses:
 *       200:
 *         description: Customer summary
 *       404:
 *         description: Customer not found
 */
router.get(
  '/customer-lookup',
  authenticateJWT,
  requireRole(['owner', 'manager', 'cashier']),
  LoyaltyController.cashierLookupCustomer
);

/**
 * @swagger
 * /api/loyalty/cashier-earn:
 *   post:
 *     summary: Calculate and award points at checkout from invoice total (EGP)
 *     tags: [Loyalty]
 *     responses:
 *       200:
 *         description: Points calculated and awarded
 *       400:
 *         description: Validation or minimum purchase error
 *       409:
 *         description: Duplicate invoice
 */
router.post(
  '/cashier-earn',
  authenticateJWT,
  requireRole(['owner', 'manager', 'cashier']),
  validate(schemas.cashierEarn),
  LoyaltyController.cashierEarnByInvoice
);

router.post(
  '/manual-earn',
  authenticateJWT,
  requireRole(['owner', 'manager', 'cashier']),
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
