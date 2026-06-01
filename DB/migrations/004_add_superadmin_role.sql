-- Migration 004: Add superadmin role and superadmin access
BEGIN;

-- Extend user_role enum to include superadmin
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';

-- Allow superadmin users (tenant_id can reference a system tenant or be nullable)
-- We'll allow superadmin login by using LEFT JOIN in the auth controller

COMMIT;
