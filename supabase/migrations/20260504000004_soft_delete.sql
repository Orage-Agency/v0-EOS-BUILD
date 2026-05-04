-- ════════════════════════════════════════════════════════════════════════
-- Soft-delete (trash) for rocks, tasks, issues, notes
-- ════════════════════════════════════════════════════════════════════════
-- Adds a `deleted_at` timestamp so users can restore accidentally-deleted
-- items from /trash for 30 days before they're truly gone. Existing
-- delete actions are migrated to set this column instead of DELETE-ing
-- rows; a future scheduled job can hard-delete rows past 30 days.

ALTER TABLE rocks  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tasks  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE issues ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE notes  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial indexes — most rows are NOT deleted, so a partial index on
-- (tenant_id, deleted_at) is tiny and fast for the trash view.
CREATE INDEX IF NOT EXISTS idx_rocks_trash
  ON rocks(tenant_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_trash
  ON tasks(tenant_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_trash
  ON issues(tenant_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_trash
  ON notes(tenant_id, deleted_at DESC) WHERE deleted_at IS NOT NULL;
