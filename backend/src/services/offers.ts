import db from '../config/db.js';
import { resolveTenantId } from '../helpers/resolveTenant.js';

export class OffersError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND',
    message: string
  ) {
    super(message);
    this.name = 'OffersError';
  }
}

export interface OfferInput {
  title: string;
  description?: string | null;
  category?: string;
  original_price?: number | null;
  offer_price: number;
  image_url?: string | null;
  is_popular?: boolean;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export class OffersService {
  /**
   * Lists active, non-deleted weekly offers within their scheduled window for customer PWAs.
   */
  static async listPublicOffers(rawTenantId: string) {
    const tenantId = await resolveTenantId(rawTenantId);
    if (!tenantId) {
      throw new OffersError('NOT_FOUND', 'Tenant not found');
    }

    const res = await db.query(
      `SELECT id, title, description, category,
              original_price::float8 AS original_price,
              offer_price::float8 AS offer_price,
              image_url, is_popular, starts_at, ends_at
       FROM weekly_offers
       WHERE tenant_id = $1::uuid
         AND deleted_at IS NULL
         AND is_active = true
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at >= NOW())
       ORDER BY is_popular DESC, created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  static async listAdminOffers(tenantId: string) {
    const res = await db.query(
      `SELECT id, title, description, category,
              original_price::float8 AS original_price,
              offer_price::float8 AS offer_price,
              image_url, is_popular, is_active, starts_at, ends_at, created_at
       FROM weekly_offers
       WHERE tenant_id = $1::uuid AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  static async createOffer(tenantId: string, adminUserId: string | undefined, data: OfferInput) {
    const res = await db.query(
      `INSERT INTO weekly_offers
         (tenant_id, title, description, category, original_price, offer_price, image_url, is_popular, is_active, starts_at, ends_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, $11::timestamptz)
       RETURNING id, title, description, category, original_price::float8 AS original_price, offer_price::float8 AS offer_price, image_url, is_popular, is_active, starts_at, ends_at, created_at`,
      [
        tenantId,
        data.title.trim(),
        data.description || null,
        data.category || 'بقالة',
        data.original_price ?? null,
        data.offer_price,
        data.image_url || null,
        data.is_popular ?? false,
        data.is_active ?? true,
        data.starts_at || null,
        data.ends_at || null,
      ]
    );

    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id, new_value)
       VALUES ($1::uuid, $2::uuid, 'create_offer', 'weekly_offer', $3::uuid, $4::jsonb)`,
      [tenantId, adminUserId || null, res.rows[0].id, JSON.stringify({ title: data.title, offer_price: data.offer_price })]
    ).catch(() => {});

    return res.rows[0];
  }

  static async updateOffer(tenantId: string, adminUserId: string | undefined, offerId: string, data: Partial<OfferInput>) {
    const hasOriginalPrice = Object.prototype.hasOwnProperty.call(data, 'original_price');
    const hasStartsAt = Object.prototype.hasOwnProperty.call(data, 'starts_at');
    const hasEndsAt = Object.prototype.hasOwnProperty.call(data, 'ends_at');

    const res = await db.query(
      `UPDATE weekly_offers
       SET title = COALESCE($3, title),
           description = COALESCE($4, description),
           category = COALESCE($5, category),
           original_price = CASE WHEN $6::boolean THEN $7::numeric ELSE original_price END,
           offer_price = COALESCE($8, offer_price),
           image_url = COALESCE($9, image_url),
           is_popular = COALESCE($10, is_popular),
           is_active = COALESCE($11, is_active),
           starts_at = CASE WHEN $12::boolean THEN $13::timestamptz ELSE starts_at END,
           ends_at = CASE WHEN $14::boolean THEN $15::timestamptz ELSE ends_at END,
           updated_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
       RETURNING id, title, description, category, original_price::float8 AS original_price, offer_price::float8 AS offer_price, image_url, is_popular, is_active, starts_at, ends_at, created_at`,
      [
        offerId,
        tenantId,
        data.title?.trim() || null,
        data.description ?? null,
        data.category || null,
        hasOriginalPrice,
        hasOriginalPrice ? (data.original_price ?? null) : null,
        data.offer_price ?? null,
        data.image_url !== undefined ? (data.image_url || null) : null,
        data.is_popular ?? null,
        data.is_active ?? null,
        hasStartsAt,
        hasStartsAt ? (data.starts_at || null) : null,
        hasEndsAt,
        hasEndsAt ? (data.ends_at || null) : null,
      ]
    );

    if (res.rows.length === 0) {
      throw new OffersError('NOT_FOUND', 'Offer not found');
    }

    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id, new_value)
       VALUES ($1::uuid, $2::uuid, 'update_offer', 'weekly_offer', $3::uuid, $4::jsonb)`,
      [tenantId, adminUserId || null, offerId, JSON.stringify(data)]
    ).catch(() => {});

    return res.rows[0];
  }

  static async deleteOffer(tenantId: string, adminUserId: string | undefined, offerId: string) {
    const res = await db.query(
      `UPDATE weekly_offers SET deleted_at = NOW()
       WHERE id = $1::uuid AND tenant_id = $2::uuid AND deleted_at IS NULL
       RETURNING id`,
      [offerId, tenantId]
    );
    if (res.rows.length === 0) {
      throw new OffersError('NOT_FOUND', 'Offer not found');
    }

    await db.query(
      `INSERT INTO admin_activity_log (tenant_id, admin_user_id, action_type, target_type, target_id)
       VALUES ($1::uuid, $2::uuid, 'delete_offer', 'weekly_offer', $3::uuid)`,
      [tenantId, adminUserId || null, offerId]
    ).catch(() => {});

    return { message: 'Offer deleted', id: offerId };
  }
}
