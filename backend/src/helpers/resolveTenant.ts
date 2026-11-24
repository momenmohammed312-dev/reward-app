import db from '../config/db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true when `value` is a valid UUID v1–v5 string.
 */
export const isUuid = (value: string): boolean => UUID_RE.test(value);

/**
 * Resolves a `tenant_id` value that may be either a UUID or a URL-safe slug
 * (e.g. "mo2-loyalty") into a real UUID by querying the `tenants` table.
 *
 * @returns The resolved UUID string, or `null` if the tenant does not exist.
 *
 * @example
 * const tenantId = await resolveTenantId(req.query.tenant_id);
 * if (!tenantId) return res.status(404).json({ error: 'Tenant not found' });
 */
export async function resolveTenantId(raw: string): Promise<string | null> {
  if (!raw) return null;
  const result = await db.query(
    isUuid(raw)
      ? 'SELECT id FROM tenants WHERE id = $1::uuid OR slug = $2'
      : 'SELECT id FROM tenants WHERE slug = $1',
    isUuid(raw) ? [raw, raw] : [raw]
  );
  return (result.rows[0]?.id as string) ?? null;
}
