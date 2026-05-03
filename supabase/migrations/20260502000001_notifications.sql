-- Notifications: an in-app inbox row per recipient per event. Created by
-- server actions when they detect an event the recipient cares about
-- (task assigned to them, rock owner changed to them, milestone overdue,
-- mention, handoff). Audit log is the source of truth for what happened;
-- this table is just the per-user mailbox.

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  -- The user / system that triggered the event. Null for system events
  -- (overdue sweeps, AI nudges).
  actor_id UUID,
  -- Reference to the activity_log row that produced this notification, so
  -- the inbox can deep-link into the entity.
  source_audit_id UUID,
  kind TEXT NOT NULL,                 -- 'task_assigned', 'rock_owner_changed', 'mention', 'handoff', 'overdue', 'invite_accepted'
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                          -- relative path inside the workspace
  read_at TIMESTAMPTZ,
  emailed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_recent
  ON notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_unemailed
  ON notifications (tenant_id, created_at DESC)
  WHERE emailed_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own notifications.
DROP POLICY IF EXISTS notifications_self_select ON notifications;
CREATE POLICY notifications_self_select ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Recipients can mark their own notifications read.
DROP POLICY IF EXISTS notifications_self_update ON notifications;
CREATE POLICY notifications_self_update ON notifications
  FOR UPDATE USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());
