-- Migration: 011_pos_integrations
-- Description: Explicit POS connection management and per-tenant/branch webhook secret routing.

BEGIN;

CREATE TABLE IF NOT EXISTS pos_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'foodics',
    webhook_secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_provider_branch UNIQUE (tenant_id, provider, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_integrations_tenant ON pos_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pos_integrations_secret ON pos_integrations(webhook_secret);

COMMIT;
