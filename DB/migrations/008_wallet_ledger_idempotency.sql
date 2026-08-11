-- Migration: 008_wallet_ledger_idempotency
-- Description: Adds an idempotency_key to wallet_ledger so that retried
--              background jobs (BullMQ webhooks) and scheduled jobs can never
--              double-award or double-deduct points.

BEGIN;

ALTER TABLE wallet_ledger ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

-- Partial unique index: only rows carrying a key are guarded; NULLs are allowed
-- (legacy rows) and never conflict.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_idempotency_key
    ON wallet_ledger(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

COMMIT;
