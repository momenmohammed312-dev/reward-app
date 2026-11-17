-- Migration: 015_point_exchange_rates
-- Description: Phase 2 of cross-tenant networks: per-tenant point valuations (EGP per point)

BEGIN;

CREATE TABLE IF NOT EXISTS point_exchange_rates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id      UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    egp_per_point   NUMERIC(10,4) NOT NULL CHECK (egp_per_point > 0),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    updated_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_network_tenant_rate UNIQUE (network_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_network ON point_exchange_rates(network_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exchange_rates_tenant ON point_exchange_rates(tenant_id) WHERE is_active = true;

DROP TRIGGER IF EXISTS set_point_exchange_rates_updated_at ON point_exchange_rates;
CREATE TRIGGER set_point_exchange_rates_updated_at
    BEFORE UPDATE ON point_exchange_rates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
