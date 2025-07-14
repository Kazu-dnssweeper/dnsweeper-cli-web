-- DNSweeper Database Initialization Script
-- This script sets up the initial database schema for production deployment

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Accounts table for multi-tenant support
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'free',
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User-Account relationships
CREATE TABLE IF NOT EXISTS user_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, account_id)
);

-- DNS Records table
CREATE TABLE IF NOT EXISTS dns_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    record_type VARCHAR(10) NOT NULL,
    value TEXT NOT NULL,
    ttl INTEGER DEFAULT 3600,
    priority INTEGER,
    weight INTEGER,
    port INTEGER,
    risk_score DECIMAL(3,1),
    risk_level VARCHAR(20),
    last_analyzed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_dns_records_domain (domain),
    INDEX idx_dns_records_account (account_id),
    INDEX idx_dns_records_type (record_type),
    INDEX idx_dns_records_risk (risk_level)
);

-- Analysis Results table
CREATE TABLE IF NOT EXISTS analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    file_size BIGINT,
    record_count INTEGER,
    total_risk_score DECIMAL(5,2),
    high_risk_count INTEGER DEFAULT 0,
    medium_risk_count INTEGER DEFAULT 0,
    low_risk_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    results JSONB,
    error_message TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_analysis_account (account_id),
    INDEX idx_analysis_status (status),
    INDEX idx_analysis_created (created_at)
);

-- Change History table
CREATE TABLE IF NOT EXISTS change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    record_id UUID,
    domain VARCHAR(255) NOT NULL,
    record_type VARCHAR(10) NOT NULL,
    change_type VARCHAR(20) NOT NULL, -- create, update, delete
    previous_value TEXT,
    new_value TEXT,
    previous_ttl INTEGER,
    new_ttl INTEGER,
    source VARCHAR(50), -- manual, import, api, bulk
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_change_history_account (account_id),
    INDEX idx_change_history_domain (domain),
    INDEX idx_change_history_user (user_id),
    INDEX idx_change_history_created (created_at)
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_api_keys_account (account_id),
    INDEX idx_api_keys_hash (key_hash)
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_audit_account (account_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    domain VARCHAR(255),
    record_type VARCHAR(10),
    response_time INTEGER, -- in milliseconds
    status VARCHAR(20), -- success, failed, timeout
    server_used VARCHAR(100),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_metrics_account (account_id),
    INDEX idx_metrics_type (metric_type),
    INDEX idx_metrics_domain (domain),
    INDEX idx_metrics_created (created_at)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dns_records_updated_at BEFORE UPDATE ON dns_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: 'admin123' - change in production!)
INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
VALUES ('admin@dnsweeper.local', crypt('admin123', gen_salt('bf', 12)), 'Administrator', 'admin', true, true)
ON CONFLICT (email) DO NOTHING;

-- Insert default account
INSERT INTO accounts (name, slug, plan, owner_id)
VALUES ('Default Organization', 'default', 'enterprise', 
    (SELECT id FROM users WHERE email = 'admin@dnsweeper.local'))
ON CONFLICT (slug) DO NOTHING;

-- Link admin user to default account
INSERT INTO user_accounts (user_id, account_id, role)
VALUES (
    (SELECT id FROM users WHERE email = 'admin@dnsweeper.local'),
    (SELECT id FROM accounts WHERE slug = 'default'),
    'owner'
) ON CONFLICT (user_id, account_id) DO NOTHING;