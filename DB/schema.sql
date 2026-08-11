-- PostgreSQL 15 Database Schema for Multi-Tenant Loyalty SaaS Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS Creation
CREATE TYPE ledger_type AS ENUM ('earned', 'redeemed', 'bonus', 'refund', 'expired', 'adjustment', 'reversal');
CREATE TYPE reward_type AS ENUM ('free_item', 'discount_fixed', 'discount_percent', 'free_upgrade');
CREATE TYPE pos_type AS ENUM ('foodics', 'square', 'toast', 'custom_api', 'manual');
CREATE TYPE tier_type AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'cashier');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
CREATE TYPE webhook_status AS ENUM ('pending', 'processed', 'failed');

-- 2. TABLES Creation

-- tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    points_per_egp NUMERIC DEFAULT 1.0,
    min_purchase_egp NUMERIC DEFAULT 0,
    points_expiry_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    plan VARCHAR(20) DEFAULT 'starter',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- users Table (Control Panel Users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    role user_role DEFAULT 'manager',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
);

-- branches Table
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50),
    pos_type pos_type DEFAULT 'manual',
    pos_location_id VARCHAR(100),
    api_key VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(100),
    tier tier_type DEFAULT 'bronze',
    total_earned INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    last_visit TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_phone UNIQUE (tenant_id, phone)
);

-- otp_codes Table
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    invoice_id VARCHAR(100) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    points_earned INTEGER NOT NULL,
    pos_payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_tenant_invoice UNIQUE (tenant_id, invoice_id)
);

-- wallet_ledger Table
CREATE TABLE wallet_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type ledger_type NOT NULL,
    points INTEGER NOT NULL CHECK (points >= 0),
    reference_id UUID,
    reference_type VARCHAR(30),
    note TEXT,
    created_by VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- rewards Table
CREATE TABLE rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    reward_type reward_type NOT NULL,
    required_points INTEGER NOT NULL,
    discount_value NUMERIC,
    code_validity_hours INTEGER DEFAULT 1,
    max_redemptions INTEGER,
    min_tier tier_type,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- redemptions Table
CREATE TABLE redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT,
    code VARCHAR(20) UNIQUE NOT NULL,
    points_used INTEGER NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- subscriptions Table (SaaS Billing)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status subscription_status DEFAULT 'trialing',
    provider_sub_id VARCHAR(100),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- billing_history Table
CREATE TABLE billing_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    status VARCHAR(20) DEFAULT 'pending',
    invoice_url TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- webhook_logs Table
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    pos_type VARCHAR(20) DEFAULT 'foodics',
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    status webhook_status DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VIEWS Creation

-- customer_balances View
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

-- customer_summary View
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
    c.id,
    c.tenant_id,
    c.phone,
    c.name,
    c.tier,
    COALESCE(cb.current_balance, 0) AS points_balance,
    COALESCE(cb.total_earned, 0) AS total_earned,
    COALESCE(cb.total_redeemed, 0) AS total_redeemed,
    c.is_verified,
    c.last_visit,
    c.created_at
FROM customers c
LEFT JOIN customer_balances cb ON c.id = cb.customer_id;

-- 4. FUNCTIONS & TRIGGERS

-- Auto updated_at Trigger Function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at Triggers
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_rewards_updated_at BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Get Customer Balance helper function
CREATE OR REPLACE FUNCTION get_customer_balance(p_customer_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_balance INTEGER;
BEGIN
    SELECT points_balance INTO v_balance FROM customer_summary WHERE id = p_customer_id;
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Auto Update Customer Tier logic (Trigger Function)
CREATE OR REPLACE FUNCTION update_customer_tier()
RETURNS TRIGGER AS $$
DECLARE
    v_total_earned INTEGER;
    v_new_tier tier_type;
BEGIN
    -- Get total earned points from view
    SELECT total_earned INTO v_total_earned FROM customer_summary WHERE id = NEW.customer_id;
    v_total_earned := COALESCE(v_total_earned, 0);
    
    -- Determine Tier
    IF v_total_earned >= 5000 THEN
        v_new_tier := 'platinum';
    ELSIF v_total_earned >= 2000 THEN
        v_new_tier := 'gold';
    ELSIF v_total_earned >= 500 THEN
        v_new_tier := 'silver';
    ELSE
        v_new_tier := 'bronze';
    END IF;
    
    -- Update customer tier
    UPDATE customers SET tier = v_new_tier WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate tier when ledger changes
CREATE TRIGGER recalculate_customer_tier
AFTER INSERT ON wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION update_customer_tier();

-- Generate unique redemption codes
CREATE OR REPLACE FUNCTION generate_redemption_code()
RETURNS VARCHAR(20) AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    v_code VARCHAR(20);
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_code := 'CAFE-' || 
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

-- 5. INDEXES for Performance Optimization
CREATE INDEX idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX idx_transactions_invoice ON transactions(tenant_id, invoice_id);
CREATE INDEX idx_wallet_ledger_customer ON wallet_ledger(customer_id);
CREATE INDEX idx_wallet_ledger_tenant_customer ON wallet_ledger(tenant_id, customer_id);
CREATE INDEX idx_redemptions_code ON redemptions(code);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
