import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { validateEnv } from '../../config/validateEnv.js';
import { correlationMiddleware } from '../../middlewares/correlation.js';
import { MigrationRunner } from '../migrationRunner.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');

describe('Infrastructure & Operational Utilities', () => {
  const originalEnv = { ...process.env };
  let tempDir: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  describe('validateEnv', () => {
    it('should throw in production when required environment variables are missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;
      delete process.env.REDIS_URL;
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      expect(() => validateEnv()).toThrow('Missing required production environment variables');
    });

    it('should reject known insecure default JWT_SECRET in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.JWT_SECRET = 'm02_l0y4lty_s3cr3t_k3y_2026_#Secure!';
      process.env.JWT_REFRESH_SECRET = 'strong_refresh_secret';

      expect(() => validateEnv()).toThrow('Insecure default JWT_SECRET detected');
    });

    it('should pass in production when REDIS_URL and strong secrets are provided', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.JWT_SECRET = 'prod_super_strong_access_secret_key';
      process.env.JWT_REFRESH_SECRET = 'prod_super_strong_refresh_secret_key';

      expect(() => validateEnv()).not.toThrow();
    });

    it('should not throw in development when variables are missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DATABASE_URL;

      expect(() => validateEnv()).not.toThrow();
    });
  });

  describe('correlationMiddleware', () => {
    it('should reuse x-correlation-id header when provided', () => {
      const req: any = { headers: { 'x-correlation-id': 'corr-abc-123' } };
      const res: any = { setHeader: vi.fn() };
      const next = vi.fn();

      correlationMiddleware(req, res, next);

      expect(req.correlationId).toBe('corr-abc-123');
      expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'corr-abc-123');
      expect(next).toHaveBeenCalled();
    });

    it('should fall back to x-request-id or generate a UUID when absent', () => {
      const req1: any = { headers: { 'x-request-id': 'req-xyz' } };
      const res1: any = { setHeader: vi.fn() };
      correlationMiddleware(req1, res1, vi.fn());
      expect(req1.correlationId).toBe('req-xyz');

      const req2: any = { headers: {} };
      const res2: any = { setHeader: vi.fn() };
      correlationMiddleware(req2, res2, vi.fn());
      expect(req2.correlationId).toMatch(/^[0-9a-f-]{36}$/i);
      expect(res2.setHeader).toHaveBeenCalledWith('x-correlation-id', req2.correlationId);
    });
  });

  describe('MigrationRunner', () => {
    it('should return empty list when migrations directory does not exist', async () => {
      const mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
      (db.pool.connect as any) = vi.fn().mockResolvedValue(mockClient);

      const applied = await MigrationRunner.run(path.join(os.tmpdir(), 'non-existent-dir-99999'));

      expect(applied).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should skip already applied versions and apply pending SQL migrations in sorted order', async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mo2-mig-'));
      fs.writeFileSync(path.join(tempDir, '001_init.sql'), 'SELECT 1;');
      fs.writeFileSync(path.join(tempDir, '002_second.sql'), 'SELECT 2;');

      const mockClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql.includes('SELECT version FROM schema_migrations')) {
            return Promise.resolve({ rows: [{ version: '001' }] });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      (db.pool.connect as any) = vi.fn().mockResolvedValue(mockClient);

      const applied = await MigrationRunner.run(tempDir);

      expect(applied).toEqual(['002_second.sql']);
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 2;');
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO schema_migrations (version, name) VALUES ($1, $2)',
        ['002', '002_second.sql']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback and rethrow when a migration SQL statement fails', async () => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mo2-mig-err-'));
      fs.writeFileSync(path.join(tempDir, '003_broken.sql'), 'INVALID SQL;');

      const mockClient = {
        query: vi.fn().mockImplementation((sql: string) => {
          if (sql === 'INVALID SQL;') {
            return Promise.reject(new Error('syntax error'));
          }
          return Promise.resolve({ rows: [] });
        }),
        release: vi.fn(),
      };
      (db.pool.connect as any) = vi.fn().mockResolvedValue(mockClient);

      await expect(MigrationRunner.run(tempDir)).rejects.toThrow('syntax error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
