-- ============================================================================
-- ORAGE CORE · 004 · ROW-LEVEL SECURITY
-- Multi-tenant isolation enforced at the DB. Service role bypasses these.
-- ============================================================================

-- Enable RLS on every tenant-scoped table -------------------------------------
ALTER TABLE rocks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rock_milestones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_handoffs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_metrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links               ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_mentions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_captures         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_nudges                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights              ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vto_documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships       ENABLE ROW LEVEL SECURITY;

-- Helper: tenant ids accessible to a user (members + master sees all) ---------
CREATE OR REPLACE FUNCTION user_tenant_ids(uid UUID) RETURNS UUID[] AS $$
  SELECT ARRAY(
    SELECT tenant_id FROM tenant_memberships WHERE user_id = uid
    UNION
    SELECT id FROM tenants
      WHERE EXISTS (SELECT 1 FROM users WHERE id = uid AND is_master = true)
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION user_role_in_tenant(uid UUID, tid UUID) RETURNS TEXT AS $$
  SELECT role FROM tenant_memberships
   WHERE user_id = uid AND tenant_id = tid LIMIT 1;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION can_edit_rocks(uid UUID, tid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
     WHERE user_id = uid AND tenant_id = tid
       AND role IN ('founder','admin','leader')
  ) OR EXISTS (
    SELECT 1 FROM users WHERE id = uid AND is_master = true
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION can_edit_vto(uid UUID, tid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM tenant_memberships
     WHERE user_id = uid AND tenant_id = tid AND role = 'founder'
  ) OR EXISTS (
    SELECT 1 FROM users WHERE id = uid AND is_master = true
  );
$$ LANGUAGE SQL STABLE;

-- Apply tenant isolation to every tenant-scoped table -------------------------
DO $$
DECLARE
  tbl TEXT;
  pol_name TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'rocks','rock_milestones','tasks','task_handoffs','issues',
    'scorecard_metrics','notes','note_links','note_mentions',
    'meetings','meeting_captures','ai_nudges','ai_conversations','ai_insights',
    'accountability_roles','vto_documents','activity_log',
    'calendar_events','integration_credentials'
  ]) LOOP
    pol_name := tbl || '_iso';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (tenant_id = ANY(user_tenant_ids(auth.uid())))',
      pol_name, tbl
    );
  END LOOP;
END $$;

-- scorecard_entries goes through the metric for tenant scoping ---------------
DROP POLICY IF EXISTS scorecard_entries_iso ON scorecard_entries;
CREATE POLICY scorecard_entries_iso ON scorecard_entries FOR ALL USING (
  EXISTS (
    SELECT 1 FROM scorecard_metrics m
     WHERE m.id = scorecard_entries.metric_id
       AND m.tenant_id = ANY(user_tenant_ids(auth.uid()))
  )
);

-- Tenants table: members can read their own tenants; master sees all ---------
DROP POLICY IF EXISTS tenants_member_select ON tenants;
CREATE POLICY tenants_member_select ON tenants FOR SELECT USING (
  id = ANY(user_tenant_ids(auth.uid()))
);
DROP POLICY IF EXISTS tenants_master_all ON tenants;
CREATE POLICY tenants_master_all ON tenants FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND is_master = true)
);

-- Users table: each user can read themselves; master sees all ----------------
DROP POLICY IF EXISTS users_self_select ON users;
CREATE POLICY users_self_select ON users FOR SELECT USING (
  auth_id = auth.uid()
);
DROP POLICY IF EXISTS users_master_all ON users;
CREATE POLICY users_master_all ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users u2 WHERE u2.id = auth.uid() AND u2.is_master = true)
);

-- Memberships: a user can see memberships of tenants they belong to ----------
DROP POLICY IF EXISTS memberships_iso ON tenant_memberships;
CREATE POLICY memberships_iso ON tenant_memberships FOR ALL USING (
  tenant_id = ANY(user_tenant_ids(auth.uid()))
);

-- Role-based write policies (in addition to tenant isolation) ----------------
DROP POLICY IF EXISTS rocks_role_write  ON rocks;
DROP POLICY IF EXISTS rocks_role_update ON rocks;
DROP POLICY IF EXISTS rocks_role_delete ON rocks;
CREATE POLICY rocks_role_write  ON rocks FOR INSERT
  WITH CHECK (can_edit_rocks(auth.uid(), tenant_id));
CREATE POLICY rocks_role_update ON rocks FOR UPDATE
  USING (can_edit_rocks(auth.uid(), tenant_id));
CREATE POLICY rocks_role_delete ON rocks FOR DELETE
  USING (can_edit_rocks(auth.uid(), tenant_id));

DROP POLICY IF EXISTS vto_role_write  ON vto_documents;
DROP POLICY IF EXISTS vto_role_update ON vto_documents;
DROP POLICY IF EXISTS vto_role_delete ON vto_documents;
CREATE POLICY vto_role_write  ON vto_documents FOR INSERT
  WITH CHECK (can_edit_vto(auth.uid(), tenant_id));
CREATE POLICY vto_role_update ON vto_documents FOR UPDATE
  USING (can_edit_vto(auth.uid(), tenant_id));
CREATE POLICY vto_role_delete ON vto_documents FOR DELETE
  USING (can_edit_vto(auth.uid(), tenant_id));

DROP POLICY IF EXISTS roles_write ON accountability_roles;
CREATE POLICY roles_write ON accountability_roles FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tenant_memberships
     WHERE user_id = auth.uid()
       AND tenant_id = accountability_roles.tenant_id
       AND role IN ('founder','admin')
  ) OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND is_master = true
  )
);
