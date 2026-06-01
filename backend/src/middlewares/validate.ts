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
    tenant_id: z.string().uuid('Invalid tenant ID'),
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().optional(),
    role: z.enum(['owner', 'manager', 'cashier']).optional(),
  }),

  createReward: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    points_required: z.number().int().positive('Points must be positive'),
    category: z.string().optional(),
    expiry_days: z.number().int().positive().optional(),
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
    customer_id: z.string().min(1, 'customer_id is required'),
    amount: z.number().int().positive('Amount must be positive'),
    note: z.string().optional(),
  }),

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
};
