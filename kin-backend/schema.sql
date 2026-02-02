-- Kin Backend Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'trialing', 'canceled', 'past_due')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on clerk_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ============================================
-- Bot Connections Table
-- ============================================
CREATE TABLE IF NOT EXISTS bot_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  phone_number VARCHAR(50),
  chat_id VARCHAR(100),
  username VARCHAR(100),
  is_connected BOOLEAN DEFAULT FALSE,
  connected_at TIMESTAMP WITH TIME ZONE,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure either phone_number or chat_id is set based on platform
  CONSTRAINT check_identifier CHECK (
    (platform = 'whatsapp' AND phone_number IS NOT NULL) OR
    (platform = 'telegram' AND chat_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bot_connections_user_id ON bot_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_connections_phone ON bot_connections(phone_number) WHERE platform = 'whatsapp';
CREATE INDEX IF NOT EXISTS idx_bot_connections_chat ON bot_connections(chat_id) WHERE platform = 'telegram';

-- ============================================
-- Conversations Table
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES bot_connections(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_connection_id ON conversations(connection_id);

-- ============================================
-- Incoming Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS incoming_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES bot_connections(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  external_id VARCHAR(255) NOT NULL,
  from_user VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'location')),
  content TEXT NOT NULL,
  media_url TEXT,
  caption TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incoming_messages_connection_id ON incoming_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_incoming_messages_created_at ON incoming_messages(created_at);

-- ============================================
-- Outgoing Messages Table
-- ============================================
CREATE TABLE IF NOT EXISTS outgoing_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES bot_connections(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  to_user VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('text', 'image', 'audio')),
  content TEXT NOT NULL,
  media_url TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_outgoing_messages_connection_id ON outgoing_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_messages_status ON outgoing_messages(status);
CREATE INDEX IF NOT EXISTS idx_outgoing_messages_created_at ON outgoing_messages(created_at);

-- ============================================
-- Conversation Messages Table (Chat History)
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('text', 'image', 'audio')),
  incoming_message_id UUID REFERENCES incoming_messages(id),
  outgoing_message_id UUID REFERENCES outgoing_messages(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);

-- ============================================
-- Subscriptions Table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- ============================================
-- Functions and Triggers
-- ============================================

-- Update updated_at timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_connections_updated_at BEFORE UPDATE ON bot_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Note: In production, you would add specific policies here
-- For now, we're using service role for backend access

-- ============================================
-- Sample Data (Optional - for development)
-- ============================================

-- Uncomment to insert sample user
-- INSERT INTO users (email, clerk_id, subscription_status)
-- VALUES ('test@example.com', 'user_test_123', 'active');