import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import loyaltyRoutes from './routes/loyaltyRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import rewardsRoutes from './routes/rewardsRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';
import { generalLimiter, authLimiter, webhookLimiter } from './middlewares/rateLimit.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

dotenv.config();

const app = express();

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

import { rateLimit } from 'express-rate-limit';
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too Many Requests', message: 'حاولت كثيراً. انتظر 10 دقائق وأعد المحاولة.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/customer/otp', otpLimiter);

app.use(helmet());

app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/superadmin', superadminRoutes);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    ...(isDev && { message: err.message }),
  });
});

export default app;
