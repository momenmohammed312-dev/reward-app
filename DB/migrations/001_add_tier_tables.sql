-- Migration: 001_add_tier_tables
-- Description: Adds tier_benefits and customer_tier_history tables
-- to make tier multipliers and hierarchy configurable via DB.

BEGIN;

-- ============================================================
-- Table: tier_benefits
-- Stores multiplier and hierarchy rank per tier.
-- tenant_id = NULL means system default.
-- Tenant-specific rows override system defaults.
-- Lookup pattern:
--   SELECT multiplier, hierarchy_rank
--   FROM tier_benefits
--   WHERE (tenant_id = $1 OR tenant_id IS NULL)
--   AND tier_name = $2
--   ORDER BY tenant_id NULLS LAST
--   LIMIT 1;
-- ============================================================
CREATE TABLE IF NOT EXISTS tier_benefits (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,
    tier_name       tier_type NOT NULL,
    multiplier      NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    hierarchy_rank  INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tier_benefits_tenant_tier UNIQUE (tenant_id, tier_name),
    CONSTRAINT ck_multiplier_positive CHECK (multiplier > 0),
    CONSTRAINT ck_hierarchy_rank_positive CHECK (hierarchy_rank > 0)
);

-- ============================================================
-- Table: customer_tier_history
-- Audit log for tier changes on customers.
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_tier_history (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    old_tier    tier_type,
    new_tier    tier_type NOT NULL,
    changed_by  UUID,
    reason      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed data: system-default rows (tenant_id = NULL)
-- ============================================================
INSERT INTO tier_benefits (tier_name, multiplier, hierarchy_rank) VALUES
    ('bronze',   1.0, 1),
    ('silver',   1.5, 2),
    ('gold',     2.0, 3),
    ('platinum', 3.0, 4)
ON CONFLICT (tenant_id, tier_name) WHERE tenant_id IS NULL DO NOTHING;

COMMIT;
