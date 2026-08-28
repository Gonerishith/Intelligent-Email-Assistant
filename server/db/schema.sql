-- Supabase PostgreSQL Schema for Intelligent Email Assistant
-- Run this SQL in the Supabase SQL Editor to provision all tables with Row Level Security (RLS)

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'User',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 2. Create Connected Accounts Table (Google Workspace / Gmail OAuth)
CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  email TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  scope TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_provider_email UNIQUE (user_id, provider, email)
);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user_id ON public.connected_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_email ON public.connected_accounts (email);

-- 3. Create AI Activity Table (Audit trail of AI summarization, drafts, action items)
CREATE TABLE IF NOT EXISTS public.ai_activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email_id TEXT,
  action_type TEXT NOT NULL, -- 'summary', 'reply_generation', 'priority_detection', 'action_item_extraction', 'email_received', 'email_sent'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  generated_content TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_activity_user_id ON public.ai_activity (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_activity_created_at ON public.ai_activity (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_activity_email_id ON public.ai_activity (email_id);

-- 4. Create User Preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  preferred_reply_tone TEXT NOT NULL DEFAULT 'professional', -- 'professional', 'concise', 'casual', 'persuasive'
  summary_format TEXT NOT NULL DEFAULT 'bullet_points', -- 'bullet_points', 'executive_summary', 'one_liner'
  auto_detect_action_items BOOLEAN NOT NULL DEFAULT TRUE,
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences (user_id);

-- -------------------------------------------------------------
-- Enable Row Level Security (RLS)
-- -------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- RLS Policies (Users can only access their own records)
-- -------------------------------------------------------------

-- Users table policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_self_access') THEN
    CREATE POLICY users_self_access ON public.users
      FOR ALL
      USING (auth.uid()::text = id OR auth.jwt() ->> 'sub' = id);
  END IF;
END $$;

-- Connected accounts policies (Never expose sensitive tokens to unauthorized users)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'connected_accounts' AND policyname = 'connected_accounts_self_access') THEN
    CREATE POLICY connected_accounts_self_access ON public.connected_accounts
      FOR ALL
      USING (auth.uid()::text = user_id OR auth.jwt() ->> 'sub' = user_id);
  END IF;
END $$;

-- AI activity policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_activity' AND policyname = 'ai_activity_self_access') THEN
    CREATE POLICY ai_activity_self_access ON public.ai_activity
      FOR ALL
      USING (auth.uid()::text = user_id OR auth.jwt() ->> 'sub' = user_id);
  END IF;
END $$;

-- User preferences policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_preferences' AND policyname = 'user_preferences_self_access') THEN
    CREATE POLICY user_preferences_self_access ON public.user_preferences
      FOR ALL
      USING (auth.uid()::text = user_id OR auth.jwt() ->> 'sub' = user_id);
  END IF;
END $$;
