import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController.js';
import { webhookLimiter } from '../middlewares/rateLimit.js';

const router = Router();

// Endpoint for receiving webhook calls from Foodics POS, identifying tenant via URL parameter
router.post('/foodics/:tenant_id', webhookLimiter, WebhookController.handleFoodicsWebhook);

/**
 * @swagger
 * /api/webhooks/{provider}/{tenant_id}:
 *   post:
 *     summary: Receive POS webhook for any supported provider (custom_api, square, toast, foodics)
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [foodics, custom_api, square, toast]
 *       - in: path
 *         name: tenant_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Webhook accepted and queued
 *       400:
 *         description: Unsupported provider
 *       403:
 *         description: Invalid HMAC signature or unconfigured secret
 */
router.post('/:provider/:tenant_id', webhookLimiter, WebhookController.handleProviderWebhook);

export default router;
