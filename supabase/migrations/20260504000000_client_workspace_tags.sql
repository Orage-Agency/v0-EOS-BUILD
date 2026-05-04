-- ════════════════════════════════════════════════════════════════════════
-- Client-workspace tagging on tasks & rocks
-- ════════════════════════════════════════════════════════════════════════
-- An agency-tier user (the only person who is a member of multiple
-- workspaces — typically the founder of the parent workspace) can tag a
-- task or rock inside their primary workspace with the client workspace
-- it relates to. The tag drives a small colored dot in the UI sourced
-- from the client workspace's `brand_color`.
--
-- Tags are private to the workspace where the row lives — tagging an
-- ORAGE task as "for Quintessa" does NOT make the task visible to the
-- Quintessa workspace; it's a label inside the agency's view only.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS brand_color TEXT;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS client_workspace_id UUID
    REFERENCES workspaces(id) ON DELETE SET NULL;

ALTER TABLE rocks
  ADD COLUMN IF NOT EXISTS client_workspace_id UUID
    REFERENCES workspaces(id) ON DELETE SET NULL;

-- Partial indexes: most rows have NULL client_workspace_id, so a normal
-- index would be mostly empty and waste pages. Partial keeps it tight.
CREATE INDEX IF NOT EXISTS idx_tasks_client_workspace
  ON tasks(client_workspace_id) WHERE client_workspace_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rocks_client_workspace
  ON rocks(client_workspace_id) WHERE client_workspace_id IS NOT NULL;
