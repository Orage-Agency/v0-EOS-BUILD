-- Per-user task stars. Each user can star any task they can see in
-- their workspace. The dashboard surfaces a user's top-N most recent
-- stars so they can pin a handful of tasks to focus on.
--
-- Stars are private: starring a task does not change ownership, status,
-- or visibility for anyone else. Multiple users can star the same task
-- independently.

CREATE TABLE IF NOT EXISTS task_stars (
  task_id    uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS task_stars_user_idx
  ON task_stars(user_id, created_at DESC);
