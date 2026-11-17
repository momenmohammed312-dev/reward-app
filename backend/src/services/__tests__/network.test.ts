import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkService, NetworkError } from '../network.js';
import db from '../../config/db.js';

vi.mock('../../config/db.js');

describe('NetworkService', () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    };

    (db.pool.connect as any) = vi.fn().mockResolvedValue(mockClient);
    (db.query as any) = vi.fn();
  });

  it('should create a network cleanly with nullable optional fields', async () => {
    const row = { id: 'net-1', name: 'Cairo Cafes', slug: 'cairo-cafes', is_active: true };
    (db.query as any).mockResolvedValue({ rows: [row] });

    const created = await NetworkService.create({ name: 'Cairo Cafes', slug: 'cairo-cafes' });

    expect(created).toEqual(row);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO networks'),
      ['Cairo Cafes', 'cairo-cafes', null, null, null]
    );
  });

  it('should delegate update with no changed fields to getById', async () => {
    const row = { id: 'net-1', name: 'Cairo Cafes', members: [], member_count: 0 };
    (db.query as any).mockResolvedValue({ rows: [row] });

    const updated = await NetworkService.update('net-1', {});

    expect(updated).toEqual(row);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE n.id = $1'), ['net-1']);
  });

  describe('deactivate', () => {
    it('should deactivate network and suspend its memberships transactionally', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('UPDATE networks SET is_active = false')) {
          return Promise.resolve({ rows: [{ id: 'net-1' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      const ok = await NetworkService.deactivate('net-1');

      expect(ok).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        "UPDATE network_memberships SET status = 'suspended' WHERE network_id = $1",
        ['net-1']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback and return false when network does not exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const ok = await NetworkService.deactivate('missing-net');

      expect(ok).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('addMember', () => {
    it('should throw NETWORK_NOT_FOUND when network does not exist', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      await expect(NetworkService.addMember('net-x', 't-1')).rejects.toMatchObject({
        name: 'NetworkError',
        code: 'NETWORK_NOT_FOUND',
      });
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should throw NETWORK_INACTIVE when network is inactive', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM networks')) return Promise.resolve({ rows: [{ is_active: false }] });
        return Promise.resolve({ rows: [] });
      });

      await expect(NetworkService.addMember('net-1', 't-1')).rejects.toThrow(NetworkError);
      await expect(NetworkService.addMember('net-1', 't-1')).rejects.toMatchObject({
        code: 'NETWORK_INACTIVE',
      });
    });

    it('should throw TENANT_NOT_FOUND and TENANT_INACTIVE appropriately', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM networks')) return Promise.resolve({ rows: [{ is_active: true }] });
        if (sql.includes('FROM tenants')) return Promise.resolve({ rows: [] });
        return Promise.resolve({ rows: [] });
      });

      await expect(NetworkService.addMember('net-1', 'missing-t')).rejects.toMatchObject({
        code: 'TENANT_NOT_FOUND',
      });

      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM networks')) return Promise.resolve({ rows: [{ is_active: true }] });
        if (sql.includes('FROM tenants')) return Promise.resolve({ rows: [{ is_active: false }] });
        return Promise.resolve({ rows: [] });
      });

      await expect(NetworkService.addMember('net-1', 'inactive-t')).rejects.toMatchObject({
        code: 'TENANT_INACTIVE',
      });
    });

    it('should throw ALREADY_MEMBER for active member and reactivate suspended member', async () => {
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM networks')) return Promise.resolve({ rows: [{ is_active: true }] });
        if (sql.includes('FROM tenants')) return Promise.resolve({ rows: [{ is_active: true }] });
        if (sql.includes('FROM network_memberships')) {
          return Promise.resolve({ rows: [{ id: 'nm-1', status: 'active' }] });
        }
        return Promise.resolve({ rows: [] });
      });

      await expect(NetworkService.addMember('net-1', 't-1')).rejects.toMatchObject({
        code: 'ALREADY_MEMBER',
      });

      const reactivated = { id: 'nm-1', status: 'active' };
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM networks')) return Promise.resolve({ rows: [{ is_active: true }] });
        if (sql.includes('FROM tenants')) return Promise.resolve({ rows: [{ is_active: true }] });
        if (sql.includes('SELECT id, status FROM network_memberships')) {
          return Promise.resolve({ rows: [{ id: 'nm-1', status: 'suspended' }] });
        }
        if (sql.includes("UPDATE network_memberships SET status = 'active'")) {
          return Promise.resolve({ rows: [reactivated] });
        }
        return Promise.resolve({ rows: [] });
      });

      const res = await NetworkService.addMember('net-1', 't-1');
      expect(res).toEqual(reactivated);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should insert a new active membership when valid and not already joined', async () => {
      const inserted = { id: 'nm-new', network_id: 'net-1', tenant_id: 't-1', status: 'active' };
      mockClient.query.mockImplementation((sql: string) => {
        if (sql.includes('FROM networks')) return Promise.resolve({ rows: [{ is_active: true }] });
        if (sql.includes('FROM tenants')) return Promise.resolve({ rows: [{ is_active: true }] });
        if (sql.includes('SELECT id, status FROM network_memberships')) return Promise.resolve({ rows: [] });
        if (sql.includes('INSERT INTO network_memberships')) return Promise.resolve({ rows: [inserted] });
        return Promise.resolve({ rows: [] });
      });

      const res = await NetworkService.addMember('net-1', 't-1');
      expect(res).toEqual(inserted);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });
  });

  describe('removeMember / suspendMember / isMember', () => {
    it('should report membership checks accurately', async () => {
      (db.query as any).mockResolvedValueOnce({ rows: [{ id: 'nm-1' }] });
      expect(await NetworkService.removeMember('net-1', 't-1')).toBe(true);

      (db.query as any).mockResolvedValueOnce({ rows: [] });
      expect(await NetworkService.suspendMember('net-1', 't-1')).toBe(false);

      (db.query as any).mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      expect(await NetworkService.isMember('net-1', 't-1')).toBe(true);
    });
  });
});
