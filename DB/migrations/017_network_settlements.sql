-- Migration: 017_network_settlements
-- Description: Phase 4 of cross-tenant networks: inter-tenant financial settlements & itemization

BEGIN;

DO $$
BEGIN
    CREATE TYPE settlement_method AS ENUM ('bank_transfer', 'subscription_deduction');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE settlement_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS settlements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id          UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    from_tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    to_tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    amount_egp          NUMERIC(12,2) NOT NULL CHECK (amount_egp > 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'EGP',
    method              settlement_method NOT NULL DEFAULT 'bank_transfer',
    status              settlement_status NOT NULL DEFAULT 'pending',
    billing_history_id  UUID REFERENCES billing_history(id) ON DELETE SET NULL,
    external_reference  VARCHAR(120),
    error_message       TEXT,
    idempotency_key     VARCHAR(120),
    settled_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_settlement_distinct_tenants CHECK (from_tenant_id <> to_tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_settlements_idempotency
    ON settlements(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_settlements_network_status
    ON settlements(network_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS settlement_items (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id        UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    cross_redemption_id  UUID NOT NULL UNIQUE REFERENCES cross_tenant_redemptions(id) ON DELETE RESTRICT,
    amount_egp           NUMERIC(12,2) NOT NULL CHECK (amount_egp > 0),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement
    ON settlement_items(settlement_id);

DROP TRIGGER IF EXISTS set_settlements_updated_at ON settlements;
CREATE TRIGGER set_settlements_updated_at
    BEFORE UPDATE ON settlements
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
