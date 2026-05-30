"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loyaltyController_js_1 = require("../controllers/loyaltyController.js");
const auth_js_1 = require("../middlewares/auth.js");
const router = (0, express_1.Router)();
// Customer specific loyalty routes
router.get('/profile', auth_js_1.authenticateJWT, loyaltyController_js_1.LoyaltyController.getCustomerProfile);
router.get('/history', auth_js_1.authenticateJWT, loyaltyController_js_1.LoyaltyController.getLedgerHistory);
router.post('/redeem', auth_js_1.authenticateJWT, loyaltyController_js_1.LoyaltyController.customerRedeemReward);
// Admin / Cashier specific loyalty routes
router.post('/manual-earn', auth_js_1.authenticateJWT, (0, auth_js_1.requireRole)(['owner', 'manager']), loyaltyController_js_1.LoyaltyController.adminEarnPointsManual);
router.post('/process-redemption', auth_js_1.authenticateJWT, (0, auth_js_1.requireRole)(['owner', 'manager', 'cashier']), loyaltyController_js_1.LoyaltyController.cashierProcessRedemption);
exports.default = router;
