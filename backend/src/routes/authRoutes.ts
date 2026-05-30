import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';

const router = Router();

// Dashboard user registration & login
router.post('/register', AuthController.registerUser);
router.post('/login', AuthController.loginUser);

// Customer PWA OTP authentication
router.post('/customer/otp', AuthController.requestCustomerOTP);
router.post('/customer/verify', AuthController.verifyCustomerOTP);

export default router;
