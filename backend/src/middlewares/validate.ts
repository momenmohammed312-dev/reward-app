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
  }),

  verifyOtp: z.object({
    tenant_id: z.string().min(1, 'tenant_id is required'),
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number'),
    code: z.string().length(6, 'Code must be 6 digits'),
  }),

  login: z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),

  register: z.object({
    tenant_id: z.string().uuid('Invalid tenant ID').optional(),
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
    max_redemptions: z.number().int().positive().nullable().optional(),
  }),

  refundTransaction: z.object({
    invoice_id: z.string().min(1, 'invoice_id is required'),
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
    code: z.string().min(1, 'Code is required'),
  }),

  manualEarn: z.object({
    customer_id: z.string().optional(),
    customer_phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number').optional(),
    amount: z.number().int().positive('Amount must be positive'),
    note: z.string().optional(),
  }).refine(d => d.customer_id || d.customer_phone, { message: 'Either customer_id or customer_phone is required' }),

  createBranch: z.object({
    name: z.string().min(1, 'Name is required'),
    city: z.string().optional(),
    pos_type: z.enum(['foodics', 'square', 'toast', 'custom_api', 'manual']).optional(),
    pos_location_id: z.string().optional(),
  }),

  checkPhone: z.object({
    tenant_id: z.string().min(1, 'tenant_id is required'),
    phone: z.string().regex(/^01[0-9]{9}$/, 'Invalid Egyptian phone number'),
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
};
