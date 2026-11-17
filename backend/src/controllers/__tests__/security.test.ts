import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.hoisted(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_vitest';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_key_for_vitest';
});

import bcrypt from 'bcrypt';
import { AuthController } from '../authController.js';
import { TenantController } from '../tenantController.js';
import { OTPService } from '../../services/otp.js';
import { resolveTenantId } from '../../helpers/resolveTenant.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');
vi.mock('../../helpers/resolveTenant.js');
vi.mock('bcrypt');

describe('MO2-P2 Security Hardening Tests', () => {
  const originalEnv = { ...process.env };
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('AuthController.registerUser Tenant & Role Enforcement', () => {
    it('should forbid creating superadmin accounts even for authenticated callers', async () => {
      const req: any = {
        user: { id: 'owner-1', tenant_id: 'tenant-A', role: 'owner' },
        body: { email: 'evil@cafe.com', password: 'Password123!', role: 'superadmin' },
      };

      await AuthController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Forbidden' })
      );
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should enforce JWT tenant_id and ignore body tenant_id when caller is an owner', async () => {
      const req: any = {
        user: { id: 'owner-1', tenant_id: 'tenant-A-uuid', role: 'owner' },
        body: {
          tenant_id: 'tenant-B-uuid', // Attempted cross-tenant injection
          email: 'cashier@cafe.com',
          password: 'Password123!',
          name: 'Branch Cashier',
          role: 'cashier',
        },
      };

      (bcrypt.hash as any).mockResolvedValue('$2b$10$hashed');
      (db.query as any).mockResolvedValue({
        rows: [{ id: 'user-new', email: 'cashier@cafe.com', name: 'Branch Cashier', role: 'cashier' }],
      });

      await AuthController.registerUser(req, res);

      expect(resolveTenantId).not.toHaveBeenCalled();
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['tenant-A-uuid', 'cashier@cafe.com', '$2b$10$hashed', 'Branch Cashier', 'cashier']
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should require tenant_id for superadmin registration and resolve slugs cleanly', async () => {
      const reqMissing: any = {
        user: { id: 'sa-1', tenant_id: null, role: 'superadmin' },
        body: { email: 'owner@cafe.com', password: 'Password123!', role: 'owner' },
      };

      await AuthController.registerUser(reqMissing, res);
      expect(res.status).toHaveBeenCalledWith(400);

      vi.clearAllMocks();
      (resolveTenantId as any).mockResolvedValue('tenant-B-resolved-uuid');
      (bcrypt.hash as any).mockResolvedValue('$2b$10$hashed');
      (db.query as any).mockResolvedValue({
        rows: [{ id: 'owner-new', email: 'owner@cafe.com', name: null, role: 'owner' }],
      });

      const reqValid: any = {
        user: { id: 'sa-1', tenant_id: null, role: 'superadmin' },
        body: { tenant_id: 'pilot-cafe', email: 'owner@cafe.com', password: 'Password123!', role: 'owner' },
      };

      await AuthController.registerUser(reqValid, res);

      expect(resolveTenantId).toHaveBeenCalledWith('pilot-cafe');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['tenant-B-resolved-uuid', 'owner@cafe.com', '$2b$10$hashed', null, 'owner']
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('OTPService SMS_PROVIDER=console Mode', () => {
    it('should succeed in production when SMS_PROVIDER=console without VictoryLink credentials', async () => {
      process.env.NODE_ENV = 'production';
      process.env.SMS_PROVIDER = 'console';
      delete process.env.VICTORYLINK_USERNAME;
      delete process.env.VICTORYLINK_PASSWORD;

      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      };
      (db.pool.connect as any) = vi.fn().mockResolvedValue(mockClient);

      const result = await OTPService.generateOTP('tenant-1', '01012345678');

      expect(result).toEqual({ success: true, message: 'OTP sent successfully' });
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('TenantController Soft-Delete & Tenant Scoping', () => {
    it('should include deleted_at IS NULL when listing branches', async () => {
      const req: any = { user: { id: 'mgr-1', tenant_id: 'tenant-1', role: 'manager' } };
      (db.query as any).mockResolvedValue({ rows: [{ id: 'branch-1', name: 'Main' }] });

      await TenantController.getBranches(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE tenant_id = $1::uuid AND deleted_at IS NULL'),
        ['tenant-1']
      );
      expect(res.json).toHaveBeenCalledWith([{ id: 'branch-1', name: 'Main' }]);
    });

    it('should return 404 and enforce deleted_at IS NULL on regenerateBranchApiKey', async () => {
      const req: any = {
        user: { id: 'owner-1', tenant_id: 'tenant-1', role: 'owner' },
        params: { branch_id: 'foreign-or-deleted-branch' },
      };
      (db.query as any).mockResolvedValue({ rows: [] });

      await TenantController.regenerateBranchApiKey(req, res);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $2::uuid AND tenant_id = $3::uuid AND deleted_at IS NULL'),
        [expect.stringMatching(/^pk_/), 'foreign-or-deleted-branch', 'tenant-1']
      );
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
