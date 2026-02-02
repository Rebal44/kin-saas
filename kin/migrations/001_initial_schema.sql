-- Kin Database Schema Migration
-- Created for Supabase PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'trialing' CHECK (subscription_status IN ('active', 'trialing', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. BOT_CONNECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bot_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
    external_id TEXT NOT NULL,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform, external_id)
);

-- ============================================
-- 4. CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bot_connection_id UUID REFERENCES bot_connections(id) ON DELETE SET NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. USAGE_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('message', 'call', 'task')),
    credits_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);

-- Subscriptions indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Bot connections indexes
CREATE INDEX idx_bot_connections_user_id ON bot_connections(user_id);
CREATE INDEX idx_bot_connections_platform ON bot_connections(platform);
CREATE INDEX idx_bot_connections_external_id ON bot_connections(external_id);
CREATE INDEX idx_bot_connections_active ON bot_connections(user_id, is_active);

-- Conversations indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_bot_connection ON conversations(bot_connection_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Usage logs indexes
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX idx_usage_logs_action_type ON usage_logs(action_type);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR USERS
-- ============================================

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- RLS POLICIES FOR SUBSCRIPTIONS
-- ============================================

-- Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions" ON subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES FOR BOT_CONNECTIONS
-- ============================================

-- Users can read their own connections
CREATE POLICY "Users can read own connections" ON bot_connections
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY "Users can insert own connections" ON bot_connections
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY "Users can update own connections" ON bot_connections
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY "Users can delete own connections" ON bot_connections
    FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES FOR CONVERSATIONS
-- ============================================

-- Users can read their own conversations
CREATE POLICY "Users can read own conversations" ON conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can insert own conversations" ON conversations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES FOR USAGE_LOGS
-- ============================================

-- Users can read their own usage logs
CREATE POLICY "Users can read own usage logs" ON usage_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_connections_updated_at
    BEFORE UPDATE ON bot_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
