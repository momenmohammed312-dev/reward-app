-- Migration: 020_manager_suite_and_growth
-- Description: Adds supermarket margin/liability settings (cashier_max_invoice_egp,
--              point_value_egp, welcome_bonus_points, excluded_item_keywords),
--              customer QR signup attribution, weekly_offers table, campaigns table,
--              and composite performance indexes.

BEGIN;

-- ============================================================
-- 1. Tenant supermarket margin, bonus & POS exclusion settings
-- ============================================================
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS cashier_max_invoice_egp NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS point_value_egp NUMERIC(10,4) NOT NULL DEFAULT 0.05,
    ADD COLUMN IF NOT EXISTS welcome_bonus_points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS excluded_item_keywords TEXT[] NOT NULL DEFAULT ARRAY['سجائر','كروت شحن','شحن رصيد','ألبان أطفال','cigarettes','topup','recharge'];

-- ============================================================
-- 2. Customer QR signup attribution
-- ============================================================
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS signup_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS signup_station VARCHAR(80);

CREATE INDEX IF NOT EXISTS idx_customers_signup_branch
    ON customers(tenant_id, signup_branch_id)
    WHERE deleted_at IS NULL;

-- ============================================================
-- 3. Weekly Offers table (dynamic deals managed by store admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_offers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title           VARCHAR(120) NOT NULL,
    description     TEXT,
    category        VARCHAR(60) NOT NULL DEFAULT 'بقالة',
    original_price  NUMERIC(10,2),
    offer_price     NUMERIC(10,2) NOT NULL CHECK (offer_price > 0),
    image_url       TEXT,
    is_popular      BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_offers_tenant_active
    ON weekly_offers(tenant_id, is_active, created_at DESC)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_weekly_offers_updated_at ON weekly_offers;
CREATE TRIGGER set_weekly_offers_updated_at
    BEFORE UPDATE ON weekly_offers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 4. Campaigns table (Happy Hours & point multiplier promos)
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    description     TEXT,
    campaign_type   VARCHAR(30) NOT NULL DEFAULT 'happy_hour',
    multiplier      NUMERIC(4,2) NOT NULL DEFAULT 2.00 CHECK (multiplier >= 1.00 AND multiplier <= 10.00),
    days_of_week    INTEGER[],
    start_hour      INTEGER CHECK (start_hour IS NULL OR (start_hour >= 0 AND start_hour <= 23)),
    end_hour        INTEGER CHECK (end_hour IS NULL OR (end_hour >= 0 AND end_hour <= 23)),
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_active
    ON campaigns(tenant_id, is_active)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_campaigns_updated_at ON campaigns;
CREATE TRIGGER set_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 5. Composite performance indexes for manager tables & ledger
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_created
    ON transactions(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_redemptions_tenant_created
    ON redemptions(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_tenant_customer_created
    ON wallet_ledger(tenant_id, customer_id, created_at DESC);

COMMIT;
