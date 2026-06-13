-- Migration: 005_admin_audit_soft_delete
-- Description: Adds admin_activity_log table, soft delete columns,
--              customer_tier_history auto-logging, and fixes
--              customer_balances view to handle adjustment type.

BEGIN;

-- ============================================================
-- Table: admin_activity_log
-- Comprehensive audit trail for all admin actions.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    admin_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type     VARCHAR(50) NOT NULL,
    target_type     VARCHAR(50) NOT NULL,
    target_id       UUID,
    old_value       JSONB,
    new_value       JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_activity_log_tenant ON admin_activity_log(tenant_id, created_at DESC);
CREATE INDEX idx_admin_activity_log_admin ON admin_activity_log(admin_user_id);

-- ============================================================
-- Soft delete columns
-- ============================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE rewards   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE branches  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(tenant_id) WHERE deleted_at IS NULL;

-- ============================================================
-- customer_tier_history auto-logging via trigger
-- ============================================================
CREATE OR REPLACE FUNCTION log_tier_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.tier IS DISTINCT FROM NEW.tier THEN
        INSERT INTO customer_tier_history (customer_id, old_tier, new_tier, changed_by, reason)
        VALUES (NEW.id, OLD.tier, NEW.tier, NULL, 'Auto-updated by tier trigger');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_tier_change ON customers;
CREATE TRIGGER trigger_log_tier_change
AFTER UPDATE OF tier ON customers
FOR EACH ROW
EXECUTE FUNCTION log_tier_change();

-- ============================================================
-- Add min_earned_points threshold to tier_benefits
-- ============================================================
ALTER TABLE tier_benefits ADD COLUMN IF NOT EXISTS min_earned_points INTEGER NOT NULL DEFAULT 0;

-- Update system defaults with original hardcoded thresholds
UPDATE tier_benefits SET min_earned_points = 0       WHERE tier_name = 'bronze'   AND tenant_id IS NULL;
UPDATE tier_benefits SET min_earned_points = 500     WHERE tier_name = 'silver'   AND tenant_id IS NULL;
UPDATE tier_benefits SET min_earned_points = 2000    WHERE tier_name = 'gold'     AND tenant_id IS NULL;
UPDATE tier_benefits SET min_earned_points = 5000    WHERE tier_name = 'platinum' AND tenant_id IS NULL;

-- ============================================================
-- Replace hardcoded tier trigger with tier_benefits query
-- ============================================================
CREATE OR REPLACE FUNCTION update_customer_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_total_earned INTEGER;
    v_new_tier tier_type;
    v_cust_tier tier_type;
    v_cust_tenant_id UUID;
BEGIN
    SELECT total_earned, tier, tenant_id INTO v_total_earned, v_cust_tier, v_cust_tenant_id
    FROM customer_summary WHERE id = NEW.customer_id;
    v_total_earned := COALESCE(v_total_earned, 0);

    -- Find the highest tier the customer qualifies for based on min_earned_points
    -- Prefers tenant-specific thresholds, falls back to system defaults
    SELECT tb.tier_name INTO v_new_tier
    FROM tier_benefits tb
    WHERE (tb.tenant_id = v_cust_tenant_id OR tb.tenant_id IS NULL)
      AND tb.min_earned_points <= v_total_earned
    ORDER BY tb.tenant_id NULLS LAST, tb.hierarchy_rank DESC
    LIMIT 1;

    IF v_new_tier IS NOT NULL AND v_new_tier IS DISTINCT FROM v_cust_tier THEN
        UPDATE customers SET tier = v_new_tier WHERE id = NEW.customer_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Fix customer_balances view to handle 'adjustment' type
-- ============================================================
CREATE OR REPLACE VIEW customer_balances AS
SELECT 
    tenant_id,
    customer_id,
    SUM(CASE WHEN type IN ('earned', 'bonus', 'refund', 'adjustment') THEN points
             WHEN type IN ('redeemed', 'expired') THEN -points
        END) AS current_balance,
    SUM(CASE WHEN type IN ('earned', 'bonus') THEN points ELSE 0 END) AS total_earned,
    SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) AS total_redeemed
FROM wallet_ledger
GROUP BY tenant_id, customer_id;

COMMIT;
