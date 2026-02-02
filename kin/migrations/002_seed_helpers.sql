-- Seed data for development/testing
-- Run: psql $DATABASE_URL -f migrations/002_seed_data.sql

-- Enable pgcrypto for password hashing (if not using Supabase Auth)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert test users (these would normally be created via Supabase Auth)
-- For development, use Supabase Dashboard to create users, then insert profile data

-- Example: Insert user profile (after creating auth user)
-- INSERT INTO users (id, email, name, subscription_status)
-- VALUES 
--   ('uuid-here', 'test@example.com', 'Test User', 'trialing'),
--   ('uuid-here-2', 'pro@example.com', 'Pro User', 'active');

-- Example: Insert bot connections
-- INSERT INTO bot_connections (user_id, platform, external_id, is_active)
-- VALUES
--   ('uuid-here', 'whatsapp', '+1234567890', true),
--   ('uuid-here', 'telegram', '123456789', true),
--   ('uuid-here-2', 'whatsapp', '+0987654321', true);

-- Example: Insert conversations
-- INSERT INTO conversations (user_id, bot_connection_id, direction, message, metadata)
-- VALUES
--   ('uuid-here', 'connection-uuid', 'inbound', 'Hello, can you help me?', '{}'),
--   ('uuid-here', 'connection-uuid', 'outbound', 'Of course! What do you need help with?', '{}');

-- Example: Insert usage logs
-- INSERT INTO usage_logs (user_id, action_type, credits_used)
-- VALUES
--   ('uuid-here', 'message', 1),
--   ('uuid-here', 'message', 1),
--   ('uuid-here', 'task', 5);

-- Helper view: User stats summary
CREATE OR REPLACE VIEW user_stats AS
SELECT 
  u.id,
  u.email,
  u.subscription_status,
  COUNT(DISTINCT bc.id) FILTER (WHERE bc.is_active = true) as active_connections,
  COUNT(DISTINCT c.id) as total_messages,
  COALESCE(SUM(ul.credits_used), 0) as total_credits_used
FROM users u
LEFT JOIN bot_connections bc ON bc.user_id = u.id
LEFT JOIN conversations c ON c.user_id = u.id
LEFT JOIN usage_logs ul ON ul.user_id = u.id
GROUP BY u.id, u.email, u.subscription_status;

-- Helper function: Get conversation thread
CREATE OR REPLACE FUNCTION get_conversation_thread(
  p_user_id UUID,
  p_connection_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  direction message_direction,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.direction,
    c.message,
    c.metadata,
    c.created_at
  FROM conversations c
  WHERE c.user_id = p_user_id
    AND c.bot_connection_id = p_connection_id
  ORDER BY c.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Helper function: Get monthly usage
CREATE OR REPLACE FUNCTION get_monthly_usage(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  action_type action_type,
  total_credits BIGINT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ul.action_type,
    COALESCE(SUM(ul.credits_used), 0)::BIGINT as total_credits,
    COUNT(*)::BIGINT as count
  FROM usage_logs ul
  WHERE ul.user_id = p_user_id
    AND EXTRACT(YEAR FROM ul.created_at) = p_year
    AND EXTRACT(MONTH FROM ul.created_at) = p_month
  GROUP BY ul.action_type;
END;
$$ LANGUAGE plpgsql;
