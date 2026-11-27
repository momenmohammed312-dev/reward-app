import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger } from './services/logger.js';
import authRoutes from './routes/authRoutes.js';
import tenantRoutes from './routes/tenantRoutes.js';
import loyaltyRoutes from './routes/loyaltyRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import posRoutes from './routes/posRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import rewardsRoutes from './routes/rewardsRoutes.js';
import offersRoutes from './routes/offersRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';
import superadminNetworkRoutes from './routes/superadminNetworkRoutes.js';
import tenantNetworkRoutes from './routes/tenantNetworkRoutes.js';
import networkCustomerRoutes from './routes/networkCustomerRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { correlationMiddleware } from './middlewares/correlation.js';
import { generalLimiter, authLimiter, webhookLimiter } from './middlewares/rateLimit.js';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();

app.use(correlationMiddleware);
app.use(helmet());

// Default dev origins cover Vite (5173/4173), CRA/Next.js (3000), and common alt ports.
// In production, set CORS_ALLOWED_ORIGINS in your .env (comma-separated list).
const defaultDevOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:8080',
];

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : defaultDevOrigins;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, curl) during dev.
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Origin not allowed by CORS'), false);
  },
  credentials: true,
}));

app.use('/api/webhooks', express.raw({ type: 'application/json', limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/superadmin/networks', superadminNetworkRoutes);
app.use('/api/tenants', tenantNetworkRoutes);
app.use('/api/networks', networkCustomerRoutes);

const protectDocs = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = queryToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
    if (err || decoded?.role !== 'superadmin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
};

app.use('/api/docs', protectDocs, swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use('/api/health', healthRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

app.use((_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested route does not exist' });
});

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, method: req.method, path: req.path });
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    ...(isDev && { message: err.message }),
  });
});

export default app;
