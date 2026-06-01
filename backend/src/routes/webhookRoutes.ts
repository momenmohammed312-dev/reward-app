import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController.js';
import { webhookLimiter } from '../middlewares/rateLimit.js';

const router = Router();

// Endpoint for receiving webhook calls from Foodics POS, identifying tenant via URL parameter
router.post('/foodics/:tenant_id', webhookLimiter, WebhookController.handleFoodicsWebhook);

export default router;
