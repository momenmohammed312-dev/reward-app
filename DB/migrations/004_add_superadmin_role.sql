-- Migration 004: Add superadmin role and superadmin access
BEGIN;

-- Extend user_role enum to include superadmin
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';

-- Allow superadmin users (tenant_id can reference a system tenant or be nullable)
ALTER TABLE users ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

COMMIT;
