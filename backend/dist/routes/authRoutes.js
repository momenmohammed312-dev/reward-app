"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_js_1 = require("../controllers/authController.js");
const router = (0, express_1.Router)();
// Dashboard user registration & login
router.post('/register', authController_js_1.AuthController.registerUser);
router.post('/login', authController_js_1.AuthController.loginUser);
// Customer PWA OTP authentication
router.post('/customer/otp', authController_js_1.AuthController.requestCustomerOTP);
router.post('/customer/verify', authController_js_1.AuthController.verifyCustomerOTP);
exports.default = router;
