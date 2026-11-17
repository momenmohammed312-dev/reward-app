-- Migration: 012_pos_customer_verification
-- Description: Tracks POS-identified customers separately from OTP-verified customers and upgrades otp_codes for SHA-256 hashes.

BEGIN;

ALTER TABLE customers
ADD COLUMN IF NOT EXISTS pos_identified_at TIMESTAMPTZ;

ALTER TABLE otp_codes
ALTER COLUMN code TYPE VARCHAR(128);

ALTER TABLE otp_codes
ADD COLUMN IF NOT EXISTS is_used BOOLEAN NOT NULL DEFAULT false;

COMMIT;
