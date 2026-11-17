-- Migration: 013_webhook_idempotency_and_rewards_concurrency
-- Description: Adds unique provider_event_id tracking to webhook_logs and redemption caps to rewards.

BEGIN;

ALTER TABLE webhook_logs
ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'foodics',
ADD COLUMN IF NOT EXISTS provider_event_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_provider_event
ON webhook_logs (tenant_id, provider, provider_event_id)
WHERE provider_event_id IS NOT NULL;

ALTER TABLE rewards
ADD COLUMN IF NOT EXISTS current_redemptions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_redemptions INTEGER DEFAULT NULL;

COMMIT;
