-- Bring the Supabase schema in line with the current `kin-backend` runtime needs,
-- and add a basic credits system.
--
-- This migration is intentionally additive / loosens constraints (fast path to launch).
-- If you already have production data, review before applying.

-- ============================================
-- USERS
-- ============================================

-- Allow running without Clerk (loginless Stripe-first flow)
ALTER TABLE public.users
  ALTER COLUMN clerk_id DROP NOT NULL;

-- ============================================
-- BOT CONNECTIONS (compat with kin-backend)
-- ============================================

-- Allow "pending" connections (no identifier yet)
ALTER TABLE public.bot_connections
  ALTER COLUMN platform_user_id DROP NOT NULL;

-- Allow multiple connection attempts per platform (each deep-link token is unique)
ALTER TABLE public.bot_connections
  DROP CONSTRAINT IF EXISTS bot_connections_user_id_platform_key;

ALTER TABLE public.bot_connections
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS chat_id TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS disconnected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- CONVERSATIONS (compat with kin-backend)
-- ============================================

-- The original table required `message` for each row; kin-backend treats `conversations`
-- as a session container and stores messages in `conversation_messages`.
ALTER TABLE public.conversations
  ALTER COLUMN message DROP NOT NULL;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS connection_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DO $$
BEGIN
  ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_connection_id_fkey
    FOREIGN KEY (connection_id) REFERENCES public.bot_connections(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_connection_id ON public.conversations(connection_id);

-- ============================================
-- MESSAGE STORAGE (required by kin-backend)
-- ============================================

CREATE TABLE IF NOT EXISTS public.incoming_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES public.bot_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  external_id TEXT NOT NULL,
  from_user TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'location')),
  content TEXT NOT NULL,
  media_url TEXT,
  caption TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incoming_messages_connection_id ON public.incoming_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_incoming_messages_created_at ON public.incoming_messages(created_at);

CREATE TABLE IF NOT EXISTS public.outgoing_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES public.bot_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('whatsapp', 'telegram')),
  to_user TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'audio')),
  content TEXT NOT NULL,
  media_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_outgoing_messages_connection_id ON public.outgoing_messages(connection_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_messages_status ON public.outgoing_messages(status);
CREATE INDEX IF NOT EXISTS idx_outgoing_messages_created_at ON public.outgoing_messages(created_at);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'audio')),
  incoming_message_id UUID REFERENCES public.incoming_messages(id),
  outgoing_message_id UUID REFERENCES public.outgoing_messages(id),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON public.conversation_messages(created_at);

-- ============================================
-- CREDITS (simple balance + ledger)
-- ============================================

CREATE TABLE IF NOT EXISTS public.credit_balances (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  delta BIGINT NOT NULL,
  reason TEXT NOT NULL,
  reference TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================

DO $$
BEGIN
  CREATE TRIGGER update_bot_connections_updated_at
  BEFORE UPDATE ON public.bot_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_credit_balances_updated_at
  BEFORE UPDATE ON public.credit_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE public.incoming_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outgoing_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- For launch speed, rely on service_role (backend) for writes.
-- Add user-facing policies later once auth is finalized.

