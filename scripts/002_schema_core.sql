-- ============================================================================
-- ORAGE CORE · 002 · CORE SCHEMA · tenants, users, memberships
-- ============================================================================

-- Tenants ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'trial',          -- trial | t1 | t2 | t3 | master | partnership
  status TEXT NOT NULL DEFAULT 'active',        -- active | trial | suspended | archived
  master_managed BOOLEAN DEFAULT false,
  branding_logo_url TEXT,
  branding_accent_hex TEXT DEFAULT '#B68039',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users -----------------------------------------------------------------------
-- Mirrors auth.users via auth_id. In dev (stub mode) auth_id can be null.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  is_master BOOLEAN DEFAULT false,
  is_field_user BOOLEAN DEFAULT false,
  qr_token_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

-- Memberships -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('founder','admin','leader','member','viewer','field')),
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_memberships_user   ON tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant ON tenant_memberships(tenant_id);
