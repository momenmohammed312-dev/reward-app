import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { OTPService } from '../services/otp.js';
import { LedgerService } from '../services/ledger.js';
import { logger } from '../services/logger.js';
import { resolveTenantId } from '../helpers/resolveTenant.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveValidBranchId(tenantId: string, rawBranchId?: string | null): Promise<string | null> {
  if (!rawBranchId || !UUID_REGEX.test(rawBranchId)) return null;
  const res = await db.query(
    'SELECT id FROM branches WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL',
    [rawBranchId, tenantId]
  );
  return res.rows[0]?.id || null;
}

const JWT_SECRET: string = process.env.JWT_SECRET || (() => { throw new Error('FATAL: JWT_SECRET environment variable is not set'); })();
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || (() => { throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is not set'); })();

export class AuthController {
  /**
   * Registers a new dashboard user for a tenant.
   * Caller must be superadmin (explicit tenant_id required) or tenant owner (JWT tenant_id enforced).
   */
  static async registerUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenant_id, email, password, name, role } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing fields', message: 'Email and password are required' });
      }

      // Defense in depth: superadmin must never be creatable via this endpoint
      if (role === 'superadmin') {
        return res.status(403).json({ error: 'Forbidden', message: 'Superadmin accounts cannot be created via registration' });
      }

      let resolvedTenantId: string | null = null;
      if (req.user?.role === 'superadmin') {
        if (!tenant_id) {
          return res.status(400).json({ error: 'Missing fields', message: 'tenant_id is required when registering as superadmin' });
        }
        resolvedTenantId = await resolveTenantId(tenant_id);
        if (!resolvedTenantId) {
          return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
        }
      } else {
        if (!req.user?.tenant_id) {
          return res.status(401).json({ error: 'Unauthorized', message: 'Authenticated tenant context is required' });
        }
        resolvedTenantId = req.user.tenant_id;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Save user
      const result = await db.query(
        `INSERT INTO users (tenant_id, email, password_hash, name, role)
         VALUES ($1::uuid, $2, $3, $4, $5)
         RETURNING id, email, name, role`,
        [resolvedTenantId, email, passwordHash, name || null, role || 'manager']
      );

      res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Conflict', message: 'User with this email already exists for this tenant' });
      }
      logger.error('Register error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Logins a dashboard user.
   */
  static async loginUser(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Missing fields', message: 'Email and password are required' });
      }

      // Find user
      const result = await db.query(
        `SELECT u.*, t.name as tenant_name FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1 AND u.is_active = true`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      const user = result.rows[0];

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          tenant_id: user.tenant_id,
          email: user.email,
          role: user.role,
          branch_id: user.branch_id || null,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant_name,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error('Login error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Check if a customer phone exists for a tenant (before sending OTP).
   */
  static async checkCustomerPhone(req: Request, res: Response) {
    try {
      const { tenant_id, phone } = req.body;

      const resolvedTenantId = await resolveTenantId(tenant_id);
      if (!resolvedTenantId) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }

      const customer = await db.query(
        'SELECT id, name, tier FROM customers WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL',
        [resolvedTenantId, phone]
      );

      res.json({
        exists: customer.rows.length > 0,
        customer: customer.rows.length > 0 ? {
          name: customer.rows[0].name,
          tier: customer.rows[0].tier,
        } : null,
      });
    } catch (error) {
      logger.error('Check phone error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Request OTP code for customer authentication.
   */
  static async requestCustomerOTP(req: Request, res: Response) {
    try {
      const { tenant_id, phone, branch_id, station } = req.body;

      if (!tenant_id || !phone) {
        return res.status(400).json({ error: 'Missing fields', message: 'tenant_id and phone are required' });
      }

      // Check if tenant exists by ID or Slug
      const resolvedTenantId = await resolveTenantId(tenant_id);
      if (!resolvedTenantId) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }

      const validBranchId = await resolveValidBranchId(resolvedTenantId, branch_id);
      const cleanStation = station ? String(station).trim().slice(0, 80) : null;

      // Find or create customer (resurrects a soft-deleted customer if one
      // exists with the same phone, since the phone is unique per tenant)
      let customerResult = await db.query(
        'SELECT id, signup_branch_id, signup_station FROM customers WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL',
        [resolvedTenantId, phone]
      );

      if (customerResult.rows.length === 0) {
        // Create new customer (or resurrect a soft-deleted one)
        customerResult = await db.query(
          `INSERT INTO customers (tenant_id, phone, signup_branch_id, signup_station)
           VALUES ($1::uuid, $2, $3::uuid, $4)
           ON CONFLICT (tenant_id, phone) DO UPDATE SET
             deleted_at = NULL,
             signup_branch_id = COALESCE(customers.signup_branch_id, EXCLUDED.signup_branch_id),
             signup_station = COALESCE(customers.signup_station, EXCLUDED.signup_station),
             updated_at = NOW()
           RETURNING id`,
          [resolvedTenantId, phone, validBranchId, cleanStation]
        );
      } else if ((validBranchId && !customerResult.rows[0].signup_branch_id) || (cleanStation && !customerResult.rows[0].signup_station)) {
        await db.query(
          `UPDATE customers
           SET signup_branch_id = COALESCE(signup_branch_id, $3::uuid),
               signup_station = COALESCE(signup_station, $4),
               updated_at = NOW()
           WHERE id = $1::uuid AND tenant_id = $2::uuid`,
          [customerResult.rows[0].id, resolvedTenantId, validBranchId, cleanStation]
        );
      }

      // Generate and store OTP
      await OTPService.generateOTP(resolvedTenantId, phone);

      res.json({ message: 'OTP sent successfully' });
    } catch (error) {
      logger.error('OTP request error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Verify customer OTP and return JWT.
   */
  static async verifyCustomerOTP(req: Request, res: Response) {
    try {
      const { tenant_id, phone, code, branch_id, station } = req.body;

      if (!tenant_id || !phone || !code) {
        return res.status(400).json({ error: 'Missing fields', message: 'tenant_id, phone, and code are required' });
      }

      // Check if tenant exists by ID or Slug
      const resolvedTenantId = await resolveTenantId(tenant_id);
      if (!resolvedTenantId) {
        return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
      }

      // Verify OTP
      let isValid = false;
      try {
        isValid = await OTPService.verifyOTP(resolvedTenantId, phone, code);
      } catch (otpError: unknown) {
        const message =
          otpError instanceof Error
            ? otpError.message
            : 'The OTP code is invalid, expired, or has exceeded attempts';
        return res.status(400).json({ error: 'Invalid OTP', message });
      }
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid OTP', message: 'The OTP code is invalid, expired, or has exceeded attempts' });
      }

      const preCheck = await db.query(
        'SELECT id, is_verified FROM customers WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL',
        [resolvedTenantId, phone]
      );
      if (preCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Customer not found' });
      }
      const wasVerified = Boolean(preCheck.rows[0].is_verified);

      const validBranchId = await resolveValidBranchId(resolvedTenantId, branch_id);
      const cleanStation = station ? String(station).trim().slice(0, 80) : null;

      // Update customer verification status, QR attribution & last visit
      const customerResult = await db.query(
        `UPDATE customers
         SET is_verified = true,
             last_visit = NOW(),
             signup_branch_id = COALESCE(signup_branch_id, $3::uuid),
             signup_station = COALESCE(signup_station, $4)
         WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL
         RETURNING id, name, phone, tier`,
        [resolvedTenantId, phone, validBranchId, cleanStation]
      );

      if (customerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Customer not found' });
      }

      const customer = customerResult.rows[0];

      // Award one-time welcome bonus points when a customer completes first OTP verification
      if (!wasVerified) {
        const tenantBonusRes = await db.query(
          'SELECT welcome_bonus_points FROM tenants WHERE id = $1::uuid',
          [resolvedTenantId]
        );
        const welcomeBonus = Number(tenantBonusRes.rows[0]?.welcome_bonus_points || 0);
        if (welcomeBonus > 0) {
          const client = await db.pool.connect();
          try {
            await client.query('BEGIN');
            await LedgerService.insert(client, {
              tenantId: resolvedTenantId,
              customerId: customer.id,
              type: 'bonus',
              points: welcomeBonus,
              referenceType: 'welcome_bonus',
              note: 'مكافأة الترحيب لأول تسجيل',
              idempotencyKey: `welcome:${resolvedTenantId}:${customer.id}`,
            });
            await client.query('COMMIT');
          } catch (bonusErr) {
            await client.query('ROLLBACK');
            logger.error('Welcome bonus error', { error: (bonusErr as Error).message });
          } finally {
            client.release();
          }
        }
      }

      // Generate short-lived access token (1h)
      const token = jwt.sign(
        {
          id: customer.id,
          tenant_id: resolvedTenantId,
          phone: customer.phone,
          role: 'customer',
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Generate long-lived refresh token (30 days)
      const refreshToken = jwt.sign(
        { id: customer.id, tenant_id: resolvedTenantId, phone: customer.phone, role: 'customer', type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
      );

      res.json({
        token,
        refreshToken,
        customer: {
          id: customer.id,
          tenant_id,
          phone: customer.phone,
          name: customer.name,
          tier: customer.tier,
        },
      });
    } catch (error) {
      logger.error('OTP verify error', { error: (error as Error).message });
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Refresh customer access token using a valid refresh token.
   */
  static async refreshCustomerToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Missing fields', message: 'refreshToken is required' });
      }

      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;

      if (decoded.type !== 'refresh' || decoded.role !== 'customer') {
        return res.status(403).json({ error: 'Forbidden', message: 'Invalid refresh token' });
      }

      // Generate new access token (15 min)
      const newToken = jwt.sign(
        { id: decoded.id, tenant_id: decoded.tenant_id, phone: decoded.phone, role: 'customer' },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      res.json({ token: newToken });
    } catch (error) {
      logger.error('Refresh token error', { error: (error as Error).message });
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired refresh token' });
    }
  }
}
