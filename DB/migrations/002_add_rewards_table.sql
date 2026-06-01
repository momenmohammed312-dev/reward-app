-- Migration 002: Extend rewards table with catalog fields
BEGIN;

-- Add missing columns to existing rewards table
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'مشروبات';
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS expiry_days INTEGER DEFAULT 30 CHECK (expiry_days > 0);

-- Index for fast catalog queries
CREATE INDEX IF NOT EXISTS idx_rewards_tenant_active 
    ON rewards(tenant_id, is_active) 
    WHERE is_active = true;

-- Seed sample rewards (safe insert with ON CONFLICT DO NOTHING)
INSERT INTO rewards (tenant_id, name, reward_type, required_points, category, expiry_days, description)
SELECT 
    id, 'قهوة مجانية', 'free_item', 300, 'مشروبات', 30, 'احصل على قهوتك المفضلة مجاناً'
FROM tenants WHERE is_active = true LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO rewards (tenant_id, name, reward_type, required_points, category, expiry_days, description)
SELECT 
    id, 'خصم 20%', 'discount_percent', 500, 'خصومات', 14, 'خصم على طلبك القادم'
FROM tenants WHERE is_active = true LIMIT 1
ON CONFLICT DO NOTHING;

COMMIT;
