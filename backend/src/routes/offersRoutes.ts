import { Router } from 'express';
import { OffersController } from '../controllers/offersController.js';

const router = Router();

/**
 * @swagger
 * /api/offers:
 *   get:
 *     summary: List active weekly supermarket/store offers for customers
 *     tags: [Offers]
 *     parameters:
 *       - in: query
 *         name: tenant_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active weekly offers
 */
router.get('/', OffersController.listPublic);

export default router;
