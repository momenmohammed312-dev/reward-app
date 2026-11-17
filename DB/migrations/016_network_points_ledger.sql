-- Migration: 016_network_points_ledger
-- Description: Phase 3 of cross-tenant networks: cross-tenant redemptions, double-entry network points ledger, and net position view

BEGIN;

DO $$
BEGIN
    CREATE TYPE network_ledger_type AS ENUM ('earn', 'redeem', 'settlement', 'adjustment', 'reversal');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE cross_redemption_status AS ENUM ('pending', 'completed', 'cancelled', 'settled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS cross_tenant_redemptions (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id                UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    source_tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    target_tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    source_customer_id        UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    target_reward_id          UUID NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
    redemption_id             UUID REFERENCES redemptions(id) ON DELETE SET NULL,
    source_points_spent       INTEGER NOT NULL CHECK (source_points_spent > 0),
    target_points_equivalent  INTEGER NOT NULL CHECK (target_points_equivalent > 0),
    egp_value                 NUMERIC(12,4) NOT NULL CHECK (egp_value > 0),
    rate_snapshot             JSONB NOT NULL,
    status                    cross_redemption_status NOT NULL DEFAULT 'completed',
    idempotency_key           VARCHAR(120),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_cross_tenant_distinct CHECK (source_tenant_id <> target_tenant_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_redemptions_idempotency
    ON cross_tenant_redemptions(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cross_redemptions_network_pair
    ON cross_tenant_redemptions(network_id, source_tenant_id, target_tenant_id, status);

CREATE TABLE IF NOT EXISTS network_points_ledger (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id              UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    counterparty_tenant_id  UUID REFERENCES tenants(id) ON DELETE SET NULL,
    customer_id             UUID REFERENCES customers(id) ON DELETE SET NULL,
    cross_redemption_id     UUID REFERENCES cross_tenant_redemptions(id) ON DELETE SET NULL,
    type                    network_ledger_type NOT NULL,
    points                  INTEGER NOT NULL CHECK (points > 0),
    egp_value               NUMERIC(12,4) NOT NULL DEFAULT 0,
    idempotency_key         VARCHAR(120),
    note                    TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_network_ledger_idempotency
    ON network_points_ledger(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_network_ledger_network_tenant
    ON network_points_ledger(network_id, tenant_id, created_at DESC);

CREATE OR REPLACE VIEW network_tenant_net_positions AS
SELECT
    network_id,
    source_tenant_id AS debtor_tenant_id,
    target_tenant_id AS creditor_tenant_id,
    COUNT(*)::int AS pending_redemptions_count,
    COALESCE(SUM(egp_value), 0)::numeric(12,2) AS owed_egp
FROM cross_tenant_redemptions
WHERE status = 'completed'
GROUP BY network_id, source_tenant_id, target_tenant_id;

COMMIT;
