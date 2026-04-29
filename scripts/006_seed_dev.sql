-- ============================================================================
-- ORAGE CORE · 006 · DEV SEED · Orage tenant + 4 founding users
-- Idempotent (uses ON CONFLICT). Safe to re-run.
-- ============================================================================

-- Tenant ----------------------------------------------------------------------
INSERT INTO tenants (id, name, slug, tier, status, master_managed)
VALUES
  ('11111111-1111-1111-1111-111111111111',
   'Orage Agency LLC', 'orage', 'master', 'active', true)
ON CONFLICT (id) DO UPDATE
  SET name           = EXCLUDED.name,
      slug           = EXCLUDED.slug,
      tier           = EXCLUDED.tier,
      status         = EXCLUDED.status,
      master_managed = EXCLUDED.master_managed;

-- Users -----------------------------------------------------------------------
-- auth_id is intentionally NULL while running in stub mode (no auth UI).
INSERT INTO users (id, email, name, is_master) VALUES
  ('aaaa1111-aaaa-1111-aaaa-111111111111', 'george@orage.agency',  'George Moffat',   true),
  ('aaaa2222-aaaa-2222-aaaa-222222222222', 'brooklyn@orage.agency', 'Brooklyn',        true),
  ('aaaa3333-aaaa-3333-aaaa-333333333333', 'baruc@orage.agency',    'Baruc Maldonado', false),
  ('aaaa4444-aaaa-4444-aaaa-444444444444', 'ivy@orage.agency',      'Ivy',             false)
ON CONFLICT (id) DO UPDATE
  SET email     = EXCLUDED.email,
      name      = EXCLUDED.name,
      is_master = EXCLUDED.is_master;

-- Memberships -----------------------------------------------------------------
INSERT INTO tenant_memberships (tenant_id, user_id, role) VALUES
  ('11111111-1111-1111-1111-111111111111',
   'aaaa1111-aaaa-1111-aaaa-111111111111', 'founder'),
  ('11111111-1111-1111-1111-111111111111',
   'aaaa2222-aaaa-2222-aaaa-222222222222', 'founder'),
  ('11111111-1111-1111-1111-111111111111',
   'aaaa3333-aaaa-3333-aaaa-333333333333', 'member'),
  ('11111111-1111-1111-1111-111111111111',
   'aaaa4444-aaaa-4444-aaaa-444444444444', 'member')
ON CONFLICT (tenant_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;
