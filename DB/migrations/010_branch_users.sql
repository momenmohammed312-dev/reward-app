-- Migration: 010_branch_users
-- Description: Links dashboard users (cashiers/owners/managers) to a branch so
--              the JWT carries a real branch_id and cashier redemption
--              processing can record which branch handled the redemption.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);

COMMIT;
