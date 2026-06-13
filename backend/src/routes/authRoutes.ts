import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { validate, schemas } from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimit.js';

const router = Router();

// Dashboard user registration & login
router.post('/register', authLimiter, validate(schemas.register), AuthController.registerUser);
router.post('/login', authLimiter, validate(schemas.login), AuthController.loginUser);

// Customer PWA OTP authentication
router.post('/customer/check', validate(schemas.checkPhone), AuthController.checkCustomerPhone);
router.post('/customer/otp', authLimiter, validate(schemas.sendOtp), AuthController.requestCustomerOTP);
router.post('/customer/verify', authLimiter, validate(schemas.verifyOtp), AuthController.verifyCustomerOTP);
router.post('/customer/refresh', authLimiter, AuthController.refreshCustomerToken);

export default router;
