-- Migration: 021_supermarket_engine_v2
-- Description: Supermarket Engine v2 — membership card numbers, O(1) cached customer balances
--              and spend tracking, itemized transaction lines, configurable earning rules,
--              refund policy, cashier daily manual points limit, and pre-expiry SMS deduplication.

BEGIN;

-- ============================================================
-- 1. Tenant supermarket engine & safeguard settings
-- ============================================================
ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS tier_basis VARCHAR(20) NOT NULL DEFAULT 'points'
        CHECK (tier_basis IN ('points', 'spend')),
    ADD COLUMN IF NOT EXISTS refund_policy VARCHAR(20) NOT NULL DEFAULT 'cap_zero'
        CHECK (refund_policy IN ('cap_zero', 'reject')),
    ADD COLUMN IF NOT EXISTS cashier_daily_manual_limit INTEGER,
    ADD COLUMN IF NOT EXISTS expiry_sms_days_before INTEGER NOT NULL DEFAULT 7;

-- ============================================================
-- 2. Customer membership card_number & O(1) cached counters
-- ============================================================
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS card_number VARCHAR(24),
    ADD COLUMN IF NOT EXISTS cached_balance INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cached_total_earned INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cached_total_redeemed INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_spent_egp NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_tenant_card
    ON customers(tenant_id, card_number)
    WHERE card_number IS NOT NULL;

-- ============================================================
-- 3. Ledger metadata (e.g., refund shortfall tracking)
-- ============================================================
ALTER TABLE wallet_ledger
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================
-- 4. Card number generator & auto-assignment trigger
-- ============================================================
CREATE OR REPLACE FUNCTION generate_customer_card_number(p_prefix VARCHAR DEFAULT 'MO2')
RETURNS VARCHAR(24) AS $$
DECLARE
    v_clean_prefix TEXT := COALESCE(NULLIF(UPPER(REGEXP_REPLACE(p_prefix, '[^A-Za-z0-9]', '', 'g')), ''), 'MO2');
    v_card VARCHAR(24);
    v_exists BOOLEAN;
BEGIN
    v_clean_prefix := LEFT(v_clean_prefix, 6);
    LOOP
        v_card := v_clean_prefix || '-' || lpad((floor(random() * 100000000)::bigint)::text, 8, '0');
        SELECT EXISTS(SELECT 1 FROM customers WHERE card_number = v_card) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    RETURN v_card;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_customer_card_number()
RETURNS TRIGGER AS $$
DECLARE
    v_prefix VARCHAR(10);
BEGIN
    IF NEW.card_number IS NULL OR BTRIM(NEW.card_number) = '' THEN
        SELECT code_prefix INTO v_prefix FROM tenants WHERE id = NEW.tenant_id;
        NEW.card_number := generate_customer_card_number(COALESCE(v_prefix, 'MO2'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_assign_card_number ON customers;
CREATE TRIGGER trg_customers_assign_card_number
    BEFORE INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION set_customer_card_number();

-- ============================================================
-- 5. Configurable Earning Rules table
-- ============================================================
CREATE TABLE IF NOT EXISTS earning_rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    rule_type       VARCHAR(30) NOT NULL
        CHECK (rule_type IN ('exclude_category', 'exclude_sku', 'category_multiplier', 'basket_bonus')),
    target_value    VARCHAR(120),
    multiplier      NUMERIC(5,2),
    min_basket_egp  NUMERIC(10,2),
    bonus_points    INTEGER,
    priority        INTEGER NOT NULL DEFAULT 100,
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earning_rules_tenant_active
    ON earning_rules(tenant_id, is_active, priority ASC)
    WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_earning_rules_updated_at ON earning_rules;
CREATE TRIGGER set_earning_rules_updated_at
    BEFORE UPDATE ON earning_rules
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 6. Normalized itemized receipt lines (transaction_items)
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_id      UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    sku                 VARCHAR(80),
    barcode             VARCHAR(80),
    product_name        VARCHAR(200) NOT NULL,
    category            VARCHAR(80),
    quantity            NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit                VARCHAR(20) NOT NULL DEFAULT 'unit',
    unit_price          NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
    net_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_excluded         BOOLEAN NOT NULL DEFAULT false,
    exclusion_reason    VARCHAR(120),
    applied_multiplier  NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    points_earned       INTEGER NOT NULL DEFAULT 0,
    refunded_quantity   NUMERIC(10,3) NOT NULL DEFAULT 0,
    refunded_points     INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx
    ON transaction_items(tenant_id, transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_items_sku
    ON transaction_items(tenant_id, sku)
    WHERE sku IS NOT NULL;

-- ============================================================
-- 7. Pre-expiry SMS deduplication log
-- ============================================================
CREATE TABLE IF NOT EXISTS expiry_notifications_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    ledger_id       UUID NOT NULL UNIQUE REFERENCES wallet_ledger(id) ON DELETE CASCADE,
    points_expiring INTEGER NOT NULL,
    expires_on      DATE NOT NULL,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expiry_notifications_tenant
    ON expiry_notifications_log(tenant_id, sent_at DESC);

-- ============================================================
-- 8. Backfill existing customers (cards, cached balances, total spend)
-- ============================================================
UPDATE customers c
SET card_number = generate_customer_card_number(COALESCE(t.code_prefix, 'MO2'))
FROM tenants t
WHERE c.tenant_id = t.id
  AND (c.card_number IS NULL OR BTRIM(c.card_number) = '');

UPDATE customers c
SET cached_balance = COALESCE(cb.current_balance, 0),
    cached_total_earned = COALESCE(cb.total_earned, 0),
    cached_total_redeemed = COALESCE(cb.total_redeemed, 0)
FROM customer_balances cb
WHERE c.id = cb.customer_id
  AND c.tenant_id = cb.tenant_id;

UPDATE customers c
SET total_spent_egp = COALESCE(tx_agg.total_spent, 0)
FROM (
    SELECT tenant_id, customer_id, COALESCE(SUM(amount), 0) AS total_spent
    FROM transactions
    GROUP BY tenant_id, customer_id
) tx_agg
WHERE c.id = tx_agg.customer_id
  AND c.tenant_id = tx_agg.tenant_id;

-- ============================================================
-- 9. O(1) customer_summary view & spend/points-aware tier trigger
--    (Preserves exact existing column order before appending new columns)
-- ============================================================
CREATE OR REPLACE VIEW customer_summary AS
SELECT
    c.id,
    c.tenant_id,
    c.phone,
    c.name,
    c.tier,
    c.cached_balance::bigint AS points_balance,
    c.cached_total_earned::bigint AS total_earned,
    c.cached_total_redeemed::bigint AS total_redeemed,
    c.is_verified,
    c.last_visit,
    c.created_at,
    c.card_number,
    c.total_spent_egp
FROM customers c;

DROP TRIGGER IF EXISTS recalculate_customer_tier ON wallet_ledger;

CREATE OR REPLACE FUNCTION update_customer_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_tier_basis VARCHAR(20);
    v_metric NUMERIC;
    v_new_tier tier_type;
BEGIN
    SELECT COALESCE(tier_basis, 'points') INTO v_tier_basis
    FROM tenants
    WHERE id = NEW.tenant_id;

    IF v_tier_basis = 'spend' THEN
        v_metric := COALESCE(NEW.total_spent_egp, 0);
    ELSE
        v_metric := COALESCE(NEW.cached_total_earned, 0);
    END IF;

    SELECT tb.tier_name INTO v_new_tier
    FROM tier_benefits tb
    WHERE (tb.tenant_id = NEW.tenant_id OR tb.tenant_id IS NULL)
      AND tb.min_earned_points <= v_metric
    ORDER BY tb.tenant_id NULLS LAST, tb.hierarchy_rank DESC
    LIMIT 1;

    IF v_new_tier IS NOT NULL AND v_new_tier IS DISTINCT FROM NEW.tier THEN
        UPDATE customers SET tier = v_new_tier WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS recalculate_customer_tier ON customers;
CREATE TRIGGER recalculate_customer_tier
    AFTER UPDATE OF cached_total_earned, total_spent_egp ON customers
    FOR EACH ROW
    WHEN (OLD.cached_total_earned IS DISTINCT FROM NEW.cached_total_earned OR OLD.total_spent_egp IS DISTINCT FROM NEW.total_spent_egp)
    EXECUTE FUNCTION update_customer_tier();

COMMIT;
