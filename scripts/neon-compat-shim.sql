-- Compatibility shim for self-hosted Postgres (Neon).
-- Original migrations were written for Supabase, which provides a built-in
-- `auth` schema with `auth.users` and `auth.uid()`. This shim recreates the
-- minimum surface so the unmodified migrations apply cleanly.
--
-- The app's actual auth lives in lib/auth/supabase-server.ts (custom JWT).
-- It queries `users` (unqualified, public schema) which is a view over
-- auth.users so INSERT/SELECT keep working.
--
-- RLS policies referencing auth.uid() are dormant because the app connects
-- as the database owner, and owners bypass RLS by default.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.users AS
  SELECT id, email, password_hash, created_at FROM auth.users;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULL::uuid
$$;
