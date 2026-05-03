-- Workspace SSO config + domain enforcement.
--
-- The actual SAML/OIDC identity provider lives in Supabase Auth (see
-- https://supabase.com/docs/guides/auth/sso/auth-sso-saml). This table is
-- the *workspace*-side record that tells the login flow which provider to
-- redirect to and which email domains are required to use it.

CREATE TABLE IF NOT EXISTS workspace_sso_config (
  workspace_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  -- Supabase SSO provider id (UUID returned by `supabase auth sso providers create`).
  provider_id UUID,
  -- Identity provider type for display only.
  provider_type TEXT,                 -- 'saml' | 'oidc'
  -- Human label shown on the workspace login page ("Sign in with Acme SSO").
  display_name TEXT,
  -- When true, members whose email matches `allowed_domains` MUST sign in
  -- via SSO; password / magic-link sign-in is rejected.
  enforced BOOLEAN NOT NULL DEFAULT false,
  -- Email domains (lowercase, no @) that route through this provider.
  allowed_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  -- Last time the config was changed; surfaced in the admin UI.
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

ALTER TABLE workspace_sso_config ENABLE ROW LEVEL SECURITY;

-- Founders / admins can manage their workspace's SSO config.
DROP POLICY IF EXISTS sso_admin_manage ON workspace_sso_config;
CREATE POLICY sso_admin_manage ON workspace_sso_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships m
      WHERE m.workspace_id = workspace_sso_config.workspace_id
        AND m.user_id = auth.uid()
        AND m.role IN ('founder', 'admin', 'owner', 'master')
    )
  );

-- Anyone authenticated in the workspace can read it (the login page needs
-- to know whether SSO is required).
DROP POLICY IF EXISTS sso_member_read ON workspace_sso_config;
CREATE POLICY sso_member_read ON workspace_sso_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_memberships m
      WHERE m.workspace_id = workspace_sso_config.workspace_id
        AND m.user_id = auth.uid()
    )
  );
