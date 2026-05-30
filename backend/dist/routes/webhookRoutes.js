"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhookController_js_1 = require("../controllers/webhookController.js");
const router = (0, express_1.Router)();
// Endpoint for receiving webhook calls from Foodics POS, identifying tenant via URL parameter
router.post('/foodics/:tenant_id', webhookController_js_1.WebhookController.handleFoodicsWebhook);
exports.default = router;
