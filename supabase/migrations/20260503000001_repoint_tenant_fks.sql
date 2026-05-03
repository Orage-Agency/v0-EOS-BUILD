-- The tables added in the prior 20260502 migrations declared
--   tenant_id UUID NOT NULL REFERENCES tenants(id)
-- but the live codebase uses `workspaces` as the canonical table — the
-- legacy `tenants` table only contains the seeded `orage` row. Newer
-- workspaces created via /signup or bootstrap-test-account live ONLY in
-- workspaces, so notifications/audit/rate-limit inserts fail with a
-- foreign-key violation.
--
-- This migration drops those FKs and re-points them at workspaces.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_tenant_id_fkey;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE ai_request_log DROP CONSTRAINT IF EXISTS ai_request_log_tenant_id_fkey;
ALTER TABLE ai_request_log
  ADD CONSTRAINT ai_request_log_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- workspace_sso_config keys on workspace_id which already FKs to tenants
-- via the original schema but the column name is workspace_id so the
-- intent is clear; re-point to workspaces too for consistency.
ALTER TABLE workspace_sso_config DROP CONSTRAINT IF EXISTS workspace_sso_config_workspace_id_fkey;
ALTER TABLE workspace_sso_config
  ADD CONSTRAINT workspace_sso_config_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
