import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation Error', details: errors });
    }
    req.body = result.data;
    next();
  };
};

// Common validation schemas
export const schemas = {
  sendOtp: z.object({
    tenant_id: z.string().min(1, 'tenant_id is required'),
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number'),
    branch_id: z.string().uuid().optional().or(z.literal('')),
    station: z.string().max(80).optional(),
  }),

  verifyOtp: z.object({
    tenant_id: z.string().min(1, 'tenant_id is required'),
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number'),
    code: z.string().length(6, 'Code must be 6 digits'),
    branch_id: z.string().uuid().optional().or(z.literal('')),
    station: z.string().max(80).optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),

  register: z.object({
    tenant_id: z.string().min(1, 'Invalid tenant ID').optional(),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().optional(),
    // superadmin is intentionally excluded: it can only be created via the seed
    // script or a trusted internal process, never through the public endpoint.
    role: z.enum(['owner', 'manager', 'cashier']).optional(),
  }),

  createReward: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    points_required: z.number().int().positive('Points must be positive'),
    category: z.string().optional(),
    expiry_days: z.number().int().positive().optional(),
    reward_type: z.enum(['free_item', 'discount_fixed', 'discount_percent', 'free_upgrade']).optional(),
    discount_value: z.number().positive().optional(),
    min_order_egp: z.number().positive().nullable().optional(),
    max_redemptions: z.number().int().positive().optional(),
  }),

  updateReward: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().nullable().optional(),
    points_required: z.number().int().positive('Points must be positive').optional(),
    category: z.string().nullable().optional(),
    expiry_days: z.number().int().positive().nullable().optional(),
    is_active: z.boolean().optional(),
    reward_type: z.enum(['free_item', 'discount_fixed', 'discount_percent', 'free_upgrade']).optional(),
    discount_value: z.number().positive().nullable().optional(),
    min_order_egp: z.number().positive().nullable().optional(),
    max_redemptions: z.number().int().positive().nullable().optional(),
  }),

  refundTransaction: z.object({
    invoice_id: z.string().min(1, 'invoice_id is required'),
    partial_amount: z.number().positive('partial_amount must be positive').optional(),
    items: z
      .array(
        z.object({
          transaction_item_id: z.string().uuid().optional(),
          sku: z.string().min(1).max(80).optional(),
          quantity: z.number().positive('Item refund quantity must be positive'),
        }).refine((i) => i.transaction_item_id || i.sku, {
          message: 'Either transaction_item_id or sku is required per item',
        })
      )
      .optional(),
    note: z.string().max(200).optional(),
  }),

  cashierEarn: z.object({
    customer_phone: z.string().min(4).max(32).optional(),
    customer_identifier: z.string().min(4).max(32).optional(),
    amount_egp: z.number().positive('Invoice amount must be positive'),
    discount_amount: z.number().min(0).optional(),
    invoice_id: z.string().min(1).max(100).optional(),
    branch_id: z.string().uuid('Invalid branch ID').optional(),
    note: z.string().max(200).optional(),
  }).refine((d) => d.customer_identifier || d.customer_phone, {
    message: 'Customer phone or card number is required',
  }),

  updateTiers: z.object({
    tiers: z.array(z.object({
      tier_name: z.enum(['bronze', 'silver', 'gold', 'platinum']),
      multiplier: z.number().min(0.1).max(10),
      min_earned_points: z.number().int().min(0),
    })).min(1).max(4),
  }),

  adjustPoints: z.object({
    customer_id: z.string().uuid('Invalid customer ID').optional(),
    customer_phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number').optional(),
    points: z.number().int().refine(v => v !== 0, 'points must not be zero'),
    note: z.string().optional(),
  }).refine(d => d.customer_id || d.customer_phone, { message: 'Either customer_id or customer_phone is required' }),

  assignBranch: z.object({
    branch_id: z.string().uuid('Invalid branch ID').nullable(),
  }),

  updateProfile: z.object({
    name: z.string().min(1, 'Name is required').max(100),
  }),

  redeemReward: z.object({
    reward_id: z.string().min(1, 'reward_id is required'),
  }),

  processRedemption: z.object({
    code: z.string().min(1, 'Code is required').optional(),
    redemption_code: z.string().min(1, 'Code is required').optional(),
  }).refine(d => d.code || d.redemption_code, { message: 'Code is required' }),

  manualEarn: z.object({
    customer_id: z.string().optional(),
    customer_phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number').optional(),
    customer_identifier: z.string().min(4).max(32).optional(),
    card_number: z.string().min(4).max(32).optional(),
    amount: z.number().int().positive('Amount must be positive').optional(),
    points: z.number().int().positive('Points must be positive').optional(),
    note: z.string().optional(),
    reason: z.string().optional(),
    branch_id: z.string().uuid().optional(),
  })
    .refine(d => d.customer_id || d.customer_phone || d.customer_identifier || d.card_number, {
      message: 'Either customer_id, customer_phone, card_number, or customer_identifier is required',
    })
    .refine(d => (d.points ?? d.amount) !== undefined, { message: 'Either amount or points is required' }),

  createBranch: z.object({
    name: z.string().min(1, 'Name is required'),
    city: z.string().optional().nullable(),
    pos_type: z.enum(['foodics', 'square', 'toast', 'custom_api', 'manual']).optional(),
    pos_location_id: z.string().optional(),
    timezone: z.string().max(64).optional(),
    opening_time: z.string().optional().nullable(),
    closing_time: z.string().optional().nullable(),
  }),

  updateBranch: z.object({
    name: z.string().min(1).optional(),
    city: z.string().optional().nullable(),
    pos_type: z.enum(['foodics', 'square', 'toast', 'custom_api', 'manual']).optional(),
    is_active: z.boolean().optional(),
    timezone: z.string().max(64).optional(),
    opening_time: z.string().optional().nullable(),
    closing_time: z.string().optional().nullable(),
  }),

  checkPhone: z.object({
    tenant_id: z.string().min(1, 'tenant_id is required'),
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number'),
  }),

  createCustomer: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number'),
    tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
    initial_points: z.number().int().min(0).max(100000).optional(),
    is_verified: z.boolean().optional(),
  }),

  updateCustomer: z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number').optional(),
    tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
    is_verified: z.boolean().optional(),
  }),

  // ─── Cross-Tenant Network Schemas ──────────────────────────
  createNetwork: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    description: z.string().max(500).optional(),
    logo_url: z.string().url('Invalid URL').optional(),
  }),

  updateNetwork: z.object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(500).optional(),
    logo_url: z.string().url('Invalid URL').optional(),
    is_active: z.boolean().optional(),
  }),

  addNetworkMember: z.object({
    tenant_id: z.string().uuid('Invalid tenant ID'),
  }),

  upsertExchangeRate: z.object({
    egp_per_point: z.number().positive('egp_per_point must be greater than 0').max(1000),
  }),

  previewConversion: z.object({
    target_tenant_id: z.string().uuid('Invalid target_tenant_id'),
    source_points: z.number().int().positive('source_points must be a positive integer'),
  }),

  crossTenantRedeem: z.object({
    target_tenant_id: z.string().uuid('Invalid target_tenant_id'),
    target_reward_id: z.string().uuid('Invalid target_reward_id'),
    source_points: z.number().int().positive('source_points must be a positive integer'),
    idempotency_key: z.string().min(1).max(120).optional(),
  }),

  createSettlement: z.object({
    from_tenant_id: z.string().uuid('Invalid from_tenant_id'),
    to_tenant_id: z.string().uuid('Invalid to_tenant_id'),
    method: z.enum(['bank_transfer', 'subscription_deduction']),
    idempotency_key: z.string().min(1).max(120).optional(),
  }),

  networkLinkRequestOtp: z.object({
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number'),
  }),

  networkLinkVerifyOtp: z.object({
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number'),
    code: z.string().length(6, 'Code must be 6 digits'),
  }),

  // ─── Manager Suite, Offers, Campaigns & POS Bridge ─────────
  createStaff: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['manager', 'cashier']),
    branch_id: z.string().uuid('Invalid branch ID').nullable().optional(),
  }),

  updateStaff: z.object({
    name: z.string().min(1).max(100).optional(),
    role: z.enum(['manager', 'cashier']).optional(),
    branch_id: z.string().uuid('Invalid branch ID').nullable().optional(),
    is_active: z.boolean().optional(),
  }),

  createOffer: z.object({
    title: z.string().min(1, 'Title is required').max(120),
    description: z.string().max(500).optional(),
    category: z.string().min(1).max(60).optional(),
    original_price: z.number().positive().nullable().optional(),
    offer_price: z.number().positive('Offer price must be positive'),
    image_url: z.string().url('Invalid image URL').optional().or(z.literal('')),
    is_popular: z.boolean().optional(),
    is_active: z.boolean().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
  }),

  updateOffer: z.object({
    title: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    category: z.string().min(1).max(60).optional(),
    original_price: z.number().positive().nullable().optional(),
    offer_price: z.number().positive().optional(),
    image_url: z.string().url('Invalid image URL').nullable().optional().or(z.literal('')),
    is_popular: z.boolean().optional(),
    is_active: z.boolean().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
  }),

  createCampaign: z.object({
    name: z.string().min(1, 'Name is required').max(120),
    description: z.string().max(500).optional(),
    campaign_type: z.enum(['happy_hour', 'multiplier', 'double_points']).optional(),
    multiplier: z.number().min(1).max(10),
    days_of_week: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    start_hour: z.number().int().min(0).max(23).nullable().optional(),
    end_hour: z.number().int().min(0).max(23).nullable().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  }),

  updateCampaign: z.object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).nullable().optional(),
    campaign_type: z.enum(['happy_hour', 'multiplier', 'double_points']).optional(),
    multiplier: z.number().min(1).max(10).optional(),
    days_of_week: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    start_hour: z.number().int().min(0).max(23).nullable().optional(),
    end_hour: z.number().int().min(0).max(23).nullable().optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  }),

  posTestWebhook: z.object({
    payload: z.record(z.any()),
    customer_tier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  }),

  logReminder: z.object({
    customer_id: z.string().uuid('Invalid customer ID'),
    channel: z.enum(['whatsapp', 'sms']).optional(),
    reminder_type: z.enum(['inactive', 'expiring']),
  }),

  updateTenant: z.object({
    name: z.string().min(1).max(100).optional(),
    points_per_egp: z.number().min(0.01).max(100).optional(),
    min_purchase_egp: z.number().min(0).max(100000).optional(),
    points_expiry_days: z.number().int().min(1).max(3650).nullable().optional(),
    logo_url: z.string().max(500).nullable().optional(),
    primary_color: z.string().max(30).optional(),
    accent_color: z.string().max(30).optional(),
    bg_color: z.string().max(30).optional(),
    surface_color: z.string().max(30).optional(),
    font_display: z.string().max(60).optional(),
    font_body: z.string().max(60).optional(),
    tagline: z.string().max(200).nullable().optional(),
    business_type: z.enum(['cafe', 'supermarket', 'retail']).optional(),
    code_prefix: z.string().min(1).max(10).optional(),
    show_menu: z.boolean().optional(),
    cashier_max_invoice_egp: z.number().positive().nullable().optional(),
    point_value_egp: z.number().positive().max(100).optional(),
    welcome_bonus_points: z.number().int().min(0).max(100000).optional(),
    excluded_item_keywords: z.array(z.string().min(1).max(60)).max(100).optional(),
    tier_basis: z.enum(['points', 'spend']).optional(),
    refund_policy: z.enum(['cap_zero', 'reject']).optional(),
    cashier_daily_manual_limit: z.number().int().positive().nullable().optional(),
    expiry_sms_days_before: z.number().int().min(0).max(90).optional(),
  }),

  // ─── Supermarket Earning Rules & Sync POS API ───────────────
  createEarningRule: z.object({
    name: z.string().min(1, 'Rule name is required').max(120),
    rule_type: z.enum(['exclude_category', 'exclude_sku', 'category_multiplier', 'basket_bonus']),
    target_value: z.string().max(120).nullable().optional(),
    multiplier: z.number().min(0.1).max(20).nullable().optional(),
    min_basket_egp: z.number().positive().nullable().optional(),
    bonus_points: z.number().int().positive().nullable().optional(),
    priority: z.number().int().min(1).max(1000).optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  }),

  updateEarningRule: z.object({
    name: z.string().min(1).max(120).optional(),
    rule_type: z.enum(['exclude_category', 'exclude_sku', 'category_multiplier', 'basket_bonus']).optional(),
    target_value: z.string().max(120).nullable().optional(),
    multiplier: z.number().min(0.1).max(20).nullable().optional(),
    min_basket_egp: z.number().positive().nullable().optional(),
    bonus_points: z.number().int().positive().nullable().optional(),
    priority: z.number().int().min(1).max(1000).optional(),
    starts_at: z.string().nullable().optional(),
    ends_at: z.string().nullable().optional(),
    is_active: z.boolean().optional(),
  }),

  posEarn: z.object({
    customer_identifier: z.string().min(4).max(32).optional(),
    customer_phone: z.string().min(4).max(32).optional(),
    card_number: z.string().min(4).max(32).optional(),
    customer_name: z.string().max(100).optional(),
    invoice_id: z.string().min(1, 'invoice_id is required').max(100),
    total_amount: z.number().positive('total_amount must be positive'),
    discount_amount: z.number().min(0).optional(),
    note: z.string().max(200).optional(),
    items: z
      .array(
        z.object({
          sku: z.string().max(80).optional(),
          barcode: z.string().max(80).optional(),
          name: z.string().max(200).optional(),
          product_name: z.string().max(200).optional(),
          category: z.string().max(80).optional(),
          quantity: z.number().positive().optional(),
          unit: z.string().max(20).optional(),
          unit_price: z.number().min(0).optional(),
          price: z.number().min(0).optional(),
          discount_amount: z.number().min(0).optional(),
          net_amount: z.number().min(0).optional(),
          amount: z.number().min(0).optional(),
          excluded: z.boolean().optional(),
        })
      )
      .optional(),
  }).refine((d) => d.customer_identifier || d.customer_phone || d.card_number, {
    message: 'Customer identifier (card_number or phone) is required',
  }),

  posRedeem: z.object({
    code: z.string().min(1).max(24).optional(),
    customer_identifier: z.string().min(4).max(32).optional(),
    reward_id: z.string().uuid().optional(),
    idempotency_key: z.string().min(1).max(120).optional(),
  }).refine((d) => Boolean(d.code) || Boolean(d.customer_identifier && d.reward_id), {
    message: 'Either code or (customer_identifier + reward_id) is required',
  }),

  posRefund: z.object({
    invoice_id: z.string().min(1, 'invoice_id is required').max(100),
    partial_amount: z.number().positive().optional(),
    items: z
      .array(
        z.object({
          transaction_item_id: z.string().uuid().optional(),
          sku: z.string().min(1).max(80).optional(),
          quantity: z.number().positive(),
        }).refine((i) => i.transaction_item_id || i.sku, {
          message: 'Either transaction_item_id or sku is required per item',
        })
      )
      .optional(),
    note: z.string().max(200).optional(),
  }),
};
