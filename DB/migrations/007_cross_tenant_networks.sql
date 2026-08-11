-- Migration: 007_cross_tenant_networks
-- Description: Creates cross-tenant loyalty network infrastructure
--              (networks, network_memberships tables)

BEGIN;

-- ============================================================
-- ENUM: network membership status
-- ============================================================
CREATE TYPE network_membership_status AS ENUM ('pending', 'active', 'suspended');

-- ============================================================
-- Table: networks
-- Represents a collaboration group between tenants
-- ============================================================
CREATE TABLE IF NOT EXISTS networks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    logo_url        TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID REFERENCES tenants(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: network_memberships
-- Links tenants to networks with status tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS network_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id      UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status          network_membership_status NOT NULL DEFAULT 'pending',
    joined_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_network_tenant UNIQUE (network_id, tenant_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_networks_slug ON networks(slug);
CREATE INDEX idx_networks_active ON networks(is_active) WHERE is_active = true;
CREATE INDEX idx_network_memberships_network ON network_memberships(network_id);
CREATE INDEX idx_network_memberships_tenant ON network_memberships(tenant_id);
CREATE INDEX idx_network_memberships_status ON network_memberships(network_id, status);

-- ============================================================
-- Trigger: auto updated_at
-- ============================================================
CREATE TRIGGER set_networks_updated_at
    BEFORE UPDATE ON networks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_network_memberships_updated_at
    BEFORE UPDATE ON network_memberships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
