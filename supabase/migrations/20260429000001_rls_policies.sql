-- ═══════════════════════════════════════════════════════════
-- Row Level Security policies for tenant isolation.
-- Run this in the Supabase SQL editor or via supabase db push.
-- ═══════════════════════════════════════════════════════════

-- Helper: resolve the workspace_id for the current JWT user
-- (looks up their active membership)
CREATE OR REPLACE FUNCTION auth_workspace_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT workspace_id
  FROM workspace_memberships
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

-- ── notes ─────────────────────────────────────────────────
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes: tenant read"
  ON notes FOR SELECT
  USING (tenant_id = auth_workspace_id());

CREATE POLICY "notes: tenant insert"
  ON notes FOR INSERT
  WITH CHECK (tenant_id = auth_workspace_id());

CREATE POLICY "notes: tenant update"
  ON notes FOR UPDATE
  USING (tenant_id = auth_workspace_id())
  WITH CHECK (tenant_id = auth_workspace_id());

CREATE POLICY "notes: tenant delete"
  ON notes FOR DELETE
  USING (tenant_id = auth_workspace_id());

-- ── meetings ──────────────────────────────────────────────
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetings: tenant read"
  ON meetings FOR SELECT
  USING (tenant_id = auth_workspace_id());

CREATE POLICY "meetings: tenant insert"
  ON meetings FOR INSERT
  WITH CHECK (tenant_id = auth_workspace_id());

CREATE POLICY "meetings: tenant update"
  ON meetings FOR UPDATE
  USING (tenant_id = auth_workspace_id())
  WITH CHECK (tenant_id = auth_workspace_id());

CREATE POLICY "meetings: tenant delete"
  ON meetings FOR DELETE
  USING (tenant_id = auth_workspace_id());

-- ── scorecard_metrics ─────────────────────────────────────
ALTER TABLE scorecard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorecard_metrics: tenant read"
  ON scorecard_metrics FOR SELECT
  USING (tenant_id = auth_workspace_id());

CREATE POLICY "scorecard_metrics: tenant write"
  ON scorecard_metrics FOR ALL
  USING (tenant_id = auth_workspace_id())
  WITH CHECK (tenant_id = auth_workspace_id());

-- ── scorecard_entries ─────────────────────────────────────
ALTER TABLE scorecard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorecard_entries: tenant read"
  ON scorecard_entries FOR SELECT
  USING (
    metric_id IN (
      SELECT id FROM scorecard_metrics WHERE tenant_id = auth_workspace_id()
    )
  );

CREATE POLICY "scorecard_entries: tenant write"
  ON scorecard_entries FOR ALL
  USING (
    metric_id IN (
      SELECT id FROM scorecard_metrics WHERE tenant_id = auth_workspace_id()
    )
  )
  WITH CHECK (
    metric_id IN (
      SELECT id FROM scorecard_metrics WHERE tenant_id = auth_workspace_id()
    )
  );

-- ── issues ────────────────────────────────────────────────
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "issues: tenant read"
  ON issues FOR SELECT
  USING (tenant_id = auth_workspace_id());

CREATE POLICY "issues: tenant write"
  ON issues FOR ALL
  USING (tenant_id = auth_workspace_id())
  WITH CHECK (tenant_id = auth_workspace_id());

-- ── rocks ─────────────────────────────────────────────────
ALTER TABLE rocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rocks: tenant read"
  ON rocks FOR SELECT
  USING (tenant_id = auth_workspace_id());

CREATE POLICY "rocks: tenant write"
  ON rocks FOR ALL
  USING (tenant_id = auth_workspace_id())
  WITH CHECK (tenant_id = auth_workspace_id());
