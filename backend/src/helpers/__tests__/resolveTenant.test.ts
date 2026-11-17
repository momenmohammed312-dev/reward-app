import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isUuid, resolveTenantId } from '../resolveTenant.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');

describe('resolveTenant helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.query as any) = vi.fn();
  });

  describe('isUuid', () => {
    it('should validate standard UUID strings case-insensitively and reject slugs', () => {
      expect(isUuid('11111111-2222-3333-4444-555555555555')).toBe(true);
      expect(isUuid('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(true);
      expect(isUuid('coffee-club')).toBe(false);
      expect(isUuid('')).toBe(false);
    });
  });

  describe('resolveTenantId', () => {
    it('should return null immediately when raw value is empty', async () => {
      const result = await resolveTenantId('');
      expect(result).toBeNull();
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should query by id::uuid OR slug when given a UUID string', async () => {
      const uuid = '11111111-2222-3333-4444-555555555555';
      (db.query as any).mockResolvedValue({ rows: [{ id: uuid }] });

      const result = await resolveTenantId(uuid);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id FROM tenants WHERE id = $1::uuid OR slug = $2',
        [uuid, uuid]
      );
      expect(result).toBe(uuid);
    });

    it('should query by slug only when given a non-UUID slug', async () => {
      const resolved = '22222222-3333-4444-5555-666666666666';
      (db.query as any).mockResolvedValue({ rows: [{ id: resolved }] });

      const result = await resolveTenantId('pilot-cafe');

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id FROM tenants WHERE slug = $1',
        ['pilot-cafe']
      );
      expect(result).toBe(resolved);
    });

    it('should return null when no matching tenant row exists', async () => {
      (db.query as any).mockResolvedValue({ rows: [] });

      const result = await resolveTenantId('unknown-slug');
      expect(result).toBeNull();
    });
  });
});
