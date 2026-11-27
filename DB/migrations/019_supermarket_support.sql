-- Migration: 019_supermarket_support
-- Description: Adds multi-vertical store configuration (business_type, code_prefix, show_menu),
--              reward minimum basket rule (min_order_egp), and neutral MO2 redemption code default.

BEGIN;

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS business_type VARCHAR(30) NOT NULL DEFAULT 'cafe',
    ADD COLUMN IF NOT EXISTS code_prefix VARCHAR(10) NOT NULL DEFAULT 'MO2',
    ADD COLUMN IF NOT EXISTS show_menu BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE rewards
    ADD COLUMN IF NOT EXISTS min_order_egp NUMERIC(10,2);

DROP FUNCTION IF EXISTS generate_redemption_code();

CREATE OR REPLACE FUNCTION generate_redemption_code(p_prefix VARCHAR DEFAULT 'MO2')
RETURNS VARCHAR(20) AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    v_clean_prefix TEXT := COALESCE(NULLIF(UPPER(REGEXP_REPLACE(p_prefix, '[^A-Za-z0-9]', '', 'g')), ''), 'MO2');
    v_code VARCHAR(20);
    v_exists BOOLEAN;
BEGIN
    v_clean_prefix := LEFT(v_clean_prefix, 6);
    LOOP
        v_code := v_clean_prefix || '-' ||
                  substr(v_chars, floor(random() * 36)::integer + 1, 1) ||
                  substr(v_chars, floor(random() * 36)::integer + 1, 1) ||
                  substr(v_chars, floor(random() * 36)::integer + 1, 1) ||
                  substr(v_chars, floor(random() * 36)::integer + 1, 1) ||
                  substr(v_chars, floor(random() * 36)::integer + 1, 1) ||
                  substr(v_chars, floor(random() * 36)::integer + 1, 1);

        SELECT EXISTS(SELECT 1 FROM redemptions WHERE code = v_code) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

COMMIT;
