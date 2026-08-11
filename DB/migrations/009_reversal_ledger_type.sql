-- Migration: 009_reversal_ledger_type
-- Description: Adds a 'reversal' ledger type so admins can debit a customer's
--              balance (manual negative adjustment) without polluting the
--              'redeemed' statistics, and updates customer_balances to treat
--              it as a deduction.

BEGIN;
ALTER TYPE ledger_type ADD VALUE IF NOT EXISTS 'reversal';
COMMIT;

CREATE OR REPLACE VIEW customer_balances AS
SELECT
    tenant_id,
    customer_id,
    SUM(CASE WHEN type IN ('earned', 'bonus', 'refund', 'adjustment') THEN points
             WHEN type IN ('redeemed', 'expired', 'reversal') THEN -points
        END) AS current_balance,
    SUM(CASE WHEN type IN ('earned', 'bonus') THEN points ELSE 0 END) AS total_earned,
    SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END) AS total_redeemed
FROM wallet_ledger
GROUP BY tenant_id, customer_id;
