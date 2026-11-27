import { Router } from 'express';
import { PosController } from '../controllers/posController.js';
import { authenticatePosApiKey } from '../middlewares/posApiKeyAuth.js';
import { webhookLimiter } from '../middlewares/rateLimit.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

router.use(webhookLimiter, authenticatePosApiKey);

/**
 * @swagger
 * /api/pos/customer/{identifier}:
 *   get:
 *     summary: Synchronous customer lookup by card_number or phone for POS terminals
 *     tags: [POS]
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer balance, wallet value, tier, and eligible rewards
 *       401:
 *         description: Invalid or missing x-api-key
 *       404:
 *         description: Customer not found
 */
router.get('/customer/:identifier', PosController.getCustomer);

/**
 * @swagger
 * /api/pos/earn:
 *   post:
 *     summary: Synchronous invoice points calculation and award for POS terminals
 *     tags: [POS]
 *     responses:
 *       200:
 *         description: Points earned and updated customer balance
 */
router.post('/earn', validate(schemas.posEarn), PosController.earn);

/**
 * @swagger
 * /api/pos/redeem:
 *   post:
 *     summary: Synchronous checkout voucher verification or instant reward redemption
 *     tags: [POS]
 *     responses:
 *       200:
 *         description: Redemption applied with reward discount details
 */
router.post('/redeem', validate(schemas.posRedeem), PosController.redeem);

/**
 * @swagger
 * /api/pos/refund:
 *   post:
 *     summary: Synchronous full, amount-partial, or itemized invoice refund clawback
 *     tags: [POS]
 *     responses:
 *       200:
 *         description: Points reversed and updated customer summary
 */
router.post('/refund', validate(schemas.posRefund), PosController.refund);

export default router;
