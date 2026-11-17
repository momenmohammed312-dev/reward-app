-- Migration: 018_network_customers
-- Description: Phase 5 of cross-tenant networks: unified network customer identity & OTP-verified tenant account links

BEGIN;

CREATE TABLE IF NOT EXISTS network_customers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id    UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    phone         VARCHAR(20) NOT NULL,
    display_name  VARCHAR(100),
    is_verified   BOOLEAN NOT NULL DEFAULT false,
    verified_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_network_customer_phone UNIQUE (network_id, phone)
);

CREATE TABLE IF NOT EXISTS network_customer_links (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_customer_id  UUID NOT NULL REFERENCES network_customers(id) ON DELETE CASCADE,
    tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id          UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    verified_via_otp     BOOLEAN NOT NULL DEFAULT false,
    linked_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_network_customer_tenant UNIQUE (network_customer_id, tenant_id),
    CONSTRAINT unique_network_customer_link UNIQUE (network_customer_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_network_customers_network_phone
    ON network_customers(network_id, phone);

CREATE INDEX IF NOT EXISTS idx_network_customer_links_customer
    ON network_customer_links(customer_id);

DROP TRIGGER IF EXISTS set_network_customers_updated_at ON network_customers;
CREATE TRIGGER set_network_customers_updated_at
    BEFORE UPDATE ON network_customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
