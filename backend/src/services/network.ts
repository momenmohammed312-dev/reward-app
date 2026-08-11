import db from '../config/db.js';
import { logger } from './logger.js';
import { PoolClient } from 'pg';

// ─── TYPES ──────────────────────────────────────────────────

export interface Network {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface NetworkMembership {
  id: string;
  network_id: string;
  tenant_id: string;
  status: 'pending' | 'active' | 'suspended';
  joined_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface NetworkMember extends NetworkMembership {
  tenant_name: string;
  tenant_slug: string;
}

export interface NetworkWithMembers extends Network {
  members: NetworkMember[];
  member_count: number;
}

export interface NetworkListItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  membership_id: string;
  membership_status: 'pending' | 'active' | 'suspended';
  joined_at: Date | null;
  member_count: number;
  network_name: string;
  network_slug: string;
  network_description: string | null;
}

// ─── SQL FRAGMENTS ──────────────────────────────────────────

const MEMBERSHIP_SUBQUERY = `
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::int AS member_count,
      jsonb_agg(
        jsonb_build_object(
          'id', nm.id,
          'network_id', nm.network_id,
          'tenant_id', nm.tenant_id,
          'status', nm.status,
          'joined_at', nm.joined_at,
          'tenant_name', t.name,
          'tenant_slug', t.slug
        )
      ) AS members
    FROM network_memberships nm
    JOIN tenants t ON t.id = nm.tenant_id
    WHERE nm.network_id = n.id
  ) m ON true
`;

const ACTIVE_COUNT_SUBQUERY = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS member_count
    FROM network_memberships
    WHERE network_id = n.id AND status = 'active'
  ) m ON true
`;

// ─── SERVICE ────────────────────────────────────────────────

export class NetworkService {

  // ─── CREATE ────────────────────────────────────────────────
  static async create(data: {
    name: string;
    slug: string;
    description?: string;
    logo_url?: string;
    created_by?: string;
  }): Promise<Network> {
    const result = await db.query(
      `INSERT INTO networks (name, slug, description, logo_url, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.slug, data.description || null, data.logo_url || null, data.created_by || null]
    );
    logger.info('Network created', { id: result.rows[0].id, slug: data.slug });
    return result.rows[0];
  }

  // ─── GET ALL ───────────────────────────────────────────────
  static async getAll(): Promise<NetworkWithMembers[]> {
    const result = await db.query(`
      SELECT n.*,
             COALESCE(m.member_count, 0)::int AS member_count,
             COALESCE(m.members, '[]'::jsonb) AS members
      FROM networks n
      ${MEMBERSHIP_SUBQUERY}
      ORDER BY n.created_at DESC
    `);
    return result.rows;
  }

  // ─── GET BY ID ─────────────────────────────────────────────
  static async getById(id: string): Promise<NetworkWithMembers | null> {
    const result = await db.query(`
      SELECT n.*,
             COALESCE(m.member_count, 0)::int AS member_count,
             COALESCE(m.members, '[]'::jsonb) AS members
      FROM networks n
      ${MEMBERSHIP_SUBQUERY}
      WHERE n.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  // ─── GET BY SLUG ───────────────────────────────────────────
  static async getBySlug(slug: string): Promise<Network | null> {
    const result = await db.query('SELECT * FROM networks WHERE slug = $1', [slug]);
    return result.rows[0] || null;
  }

  // ─── GET BY TENANT ─────────────────────────────────────────
  static async getByTenantId(tenantId: string): Promise<NetworkListItem[]> {
    const result = await db.query(`
      SELECT
        n.id,
        n.name AS network_name,
        n.slug AS network_slug,
        n.description AS network_description,
        n.logo_url,
        n.is_active,
        n.created_at,
        nm.id AS membership_id,
        nm.status AS membership_status,
        nm.joined_at,
        COALESCE(m.member_count, 0)::int AS member_count
      FROM networks n
      JOIN network_memberships nm ON nm.network_id = n.id
      ${ACTIVE_COUNT_SUBQUERY}
      WHERE nm.tenant_id = $1 AND n.is_active = true
      ORDER BY n.created_at DESC
    `, [tenantId]);
    return result.rows;
  }

  // ─── UPDATE ────────────────────────────────────────────────
  static async update(id: string, data: {
    name?: string;
    description?: string;
    logo_url?: string;
    is_active?: boolean;
  }): Promise<Network | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
    if (data.logo_url !== undefined) { fields.push(`logo_url = $${idx++}`); values.push(data.logo_url); }
    if (data.is_active !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.is_active); }

    if (fields.length === 0) return this.getById(id);

    values.push(id);
    const result = await db.query(
      `UPDATE networks SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    logger.info('Network updated', { id, fields: Object.keys(data) });
    return result.rows[0] || null;
  }

  // ─── DELETE (soft) — transactional ─────────────────────────
  static async deactivate(id: string): Promise<boolean> {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE networks SET is_active = false WHERE id = $1 RETURNING id',
        [id]
      );
      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      await client.query(
        "UPDATE network_memberships SET status = 'suspended' WHERE network_id = $1",
        [id]
      );

      await client.query('COMMIT');
      logger.info('Network deactivated', { id });
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── ADD MEMBER — transactional ────────────────────────────
  static async addMember(networkId: string, tenantId: string): Promise<NetworkMembership> {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Check network exists and is active
      const network = await client.query('SELECT is_active FROM networks WHERE id = $1', [networkId]);
      if (network.rows.length === 0) {
        throw new NetworkError('NETWORK_NOT_FOUND', 'Network not found');
      }
      if (!network.rows[0].is_active) {
        throw new NetworkError('NETWORK_INACTIVE', 'Network is inactive');
      }

      // Check tenant exists and is active
      const tenant = await client.query('SELECT is_active FROM tenants WHERE id = $1', [tenantId]);
      if (tenant.rows.length === 0) {
        throw new NetworkError('TENANT_NOT_FOUND', 'Tenant not found');
      }
      if (!tenant.rows[0].is_active) {
        throw new NetworkError('TENANT_INACTIVE', 'Tenant is inactive');
      }

      // Check if already a member
      const existing = await client.query(
        'SELECT id, status FROM network_memberships WHERE network_id = $1 AND tenant_id = $2',
        [networkId, tenantId]
      );

      if (existing.rows.length > 0) {
        if (existing.rows[0].status === 'suspended') {
          const result = await client.query(
            "UPDATE network_memberships SET status = 'active', joined_at = NOW() WHERE id = $1 RETURNING *",
            [existing.rows[0].id]
          );
          await client.query('COMMIT');
          logger.info('Network membership re-activated', { networkId, tenantId });
          return result.rows[0];
        }
        throw new NetworkError('ALREADY_MEMBER', 'Tenant is already a member');
      }

      const result = await client.query(
        `INSERT INTO network_memberships (network_id, tenant_id, status, joined_at)
         VALUES ($1, $2, 'active', NOW())
         RETURNING *`,
        [networkId, tenantId]
      );

      await client.query('COMMIT');
      logger.info('Tenant added to network', { networkId, tenantId });
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // ─── REMOVE MEMBER ─────────────────────────────────────────
  static async removeMember(networkId: string, tenantId: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM network_memberships WHERE network_id = $1 AND tenant_id = $2 RETURNING id',
      [networkId, tenantId]
    );
    if (result.rows.length > 0) {
      logger.info('Tenant removed from network', { networkId, tenantId });
      return true;
    }
    return false;
  }

  // ─── SUSPEND MEMBER ────────────────────────────────────────
  static async suspendMember(networkId: string, tenantId: string): Promise<boolean> {
    const result = await db.query(
      "UPDATE network_memberships SET status = 'suspended' WHERE network_id = $1 AND tenant_id = $2 RETURNING id",
      [networkId, tenantId]
    );
    if (result.rows.length > 0) {
      logger.info('Network membership suspended', { networkId, tenantId });
      return true;
    }
    return false;
  }

  // ─── CHECK TENANT IS MEMBER ────────────────────────────────
  static async isMember(networkId: string, tenantId: string): Promise<boolean> {
    const result = await db.query(
      "SELECT 1 FROM network_memberships WHERE network_id = $1 AND tenant_id = $2 AND status = 'active'",
      [networkId, tenantId]
    );
    return result.rows.length > 0;
  }

  // ─── GET ACTIVE NETWORKS FOR TENANT ────────────────────────
  static async getActiveNetworksForTenant(tenantId: string): Promise<Network[]> {
    const result = await db.query(`
      SELECT n.*
      FROM networks n
      JOIN network_memberships nm ON nm.network_id = n.id
      WHERE nm.tenant_id = $1
        AND nm.status = 'active'
        AND n.is_active = true
      ORDER BY n.name
    `, [tenantId]);
    return result.rows;
  }

  // ─── GET TENANTS IN NETWORK ────────────────────────────────
  static async getNetworkTenants(networkId: string): Promise<Array<{
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    status: string;
    joined_at: Date | null;
  }>> {
    const result = await db.query(`
      SELECT nm.tenant_id, t.name AS tenant_name, t.slug AS tenant_slug,
             nm.status, nm.joined_at
      FROM network_memberships nm
      JOIN tenants t ON t.id = nm.tenant_id
      WHERE nm.network_id = $1
      ORDER BY nm.joined_at
    `, [networkId]);
    return result.rows;
  }
}

// ─── CUSTOM ERROR CLASS ─────────────────────────────────────

export class NetworkError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
  }
}
