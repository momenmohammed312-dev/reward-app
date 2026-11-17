import db from '../config/db.js';
import { OTPService } from './otp.js';
import { NetworkError, NetworkService } from './network.js';

export class NetworkCustomerService {
  /**
   * Sends an OTP to verify phone ownership before linking a tenant customer
   * into a cross-tenant network identity.
   */
  static async requestLinkOtp(networkId: string, tenantId: string, phone: string) {
    const isMember = await NetworkService.isMember(networkId, tenantId);
    if (!isMember) {
      throw new NetworkError('NOT_NETWORK_MEMBER', 'Tenant is not an active member of this network');
    }

    const custRes = await db.query(
      `SELECT id FROM customers WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL`,
      [tenantId, phone]
    );
    if (custRes.rows.length === 0) {
      throw new NetworkError('CUSTOMER_NOT_FOUND', 'Customer phone is not registered under this tenant');
    }

    return OTPService.generateOTP(tenantId, phone);
  }

  /**
   * Verifies OTP and links the tenant customer row to the unified network_customers identity.
   */
  static async verifyAndLinkCustomer(networkId: string, tenantId: string, phone: string, code: string) {
    const isMember = await NetworkService.isMember(networkId, tenantId);
    if (!isMember) {
      throw new NetworkError('NOT_NETWORK_MEMBER', 'Tenant is not an active member of this network');
    }

    await OTPService.verifyOTP(tenantId, phone, code);

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const custRes = await client.query(
        `SELECT id, name, phone FROM customers
         WHERE tenant_id = $1::uuid AND phone = $2 AND deleted_at IS NULL`,
        [tenantId, phone]
      );
      if (custRes.rows.length === 0) {
        throw new NetworkError('CUSTOMER_NOT_FOUND', 'Customer not found under this tenant');
      }
      const customer = custRes.rows[0];

      const netCustRes = await client.query(
        `INSERT INTO network_customers (network_id, phone, display_name, is_verified, verified_at)
         VALUES ($1::uuid, $2, $3, true, NOW())
         ON CONFLICT (network_id, phone) DO UPDATE SET
           is_verified = true,
           verified_at = COALESCE(network_customers.verified_at, NOW()),
           display_name = COALESCE(network_customers.display_name, EXCLUDED.display_name),
           updated_at = NOW()
         RETURNING id, network_id, phone, display_name, is_verified, verified_at`,
        [networkId, phone, customer.name || null]
      );
      const networkCustomer = netCustRes.rows[0];

      await client.query(
        `INSERT INTO network_customer_links (network_customer_id, tenant_id, customer_id, verified_via_otp)
         VALUES ($1::uuid, $2::uuid, $3::uuid, true)
         ON CONFLICT (network_customer_id, tenant_id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id,
           verified_via_otp = true`,
        [networkCustomer.id, tenantId, customer.id]
      );

      await client.query('COMMIT');
      return await this.getUnifiedProfile(networkId, phone);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Returns a network customer's linked tenant accounts, individual point balances,
   * and total EGP equivalent value across active members.
   */
  static async getUnifiedProfile(networkId: string, phone: string) {
    const netCustRes = await db.query(
      `SELECT id, network_id, phone, display_name, is_verified, verified_at
       FROM network_customers
       WHERE network_id = $1::uuid AND phone = $2`,
      [networkId, phone]
    );
    if (netCustRes.rows.length === 0) {
      throw new NetworkError('NETWORK_CUSTOMER_NOT_FOUND', 'Network customer identity not found');
    }

    const identity = netCustRes.rows[0];

    const linksRes = await db.query(
      `SELECT
         l.tenant_id,
         t.name AS tenant_name,
         t.slug AS tenant_slug,
         l.customer_id,
         COALESCE(cs.points_balance, 0)::int AS points_balance,
         cs.tier,
         per.egp_per_point::float8 AS egp_per_point,
         ROUND(COALESCE(cs.points_balance, 0) * COALESCE(per.egp_per_point, 0), 2)::float8 AS egp_value,
         l.linked_at
       FROM network_customer_links l
       JOIN tenants t ON t.id = l.tenant_id
       JOIN network_memberships nm
         ON nm.network_id = $1::uuid AND nm.tenant_id = l.tenant_id AND nm.status = 'active'
       LEFT JOIN customer_summary cs
         ON cs.id = l.customer_id AND cs.tenant_id = l.tenant_id
       LEFT JOIN point_exchange_rates per
         ON per.network_id = $1::uuid AND per.tenant_id = l.tenant_id AND per.is_active = true
       WHERE l.network_customer_id = $2::uuid
       ORDER BY t.name ASC`,
      [networkId, identity.id]
    );

    const totalEgpValue =
      Math.round(
        linksRes.rows.reduce((sum, w) => sum + Number(w.egp_value || 0), 0) * 100
      ) / 100;

    return {
      identity,
      linkedWallets: linksRes.rows,
      totalEgpValue,
    };
  }
}
