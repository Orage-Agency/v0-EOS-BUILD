-- ════════════════════════════════════════════════════════════════════════
-- Track Resend send attempts on notifications
-- ════════════════════════════════════════════════════════════════════════
-- The daily-digest cron used to silently drop a notification forever the
-- first time Resend failed (transient 429, network blip). The "next day"
-- query filtered by `created_at >= yesterday`, so the row fell outside
-- the window and was never retried.
--
-- New `email_attempts` counter lets the cron retry up to MAX_ATTEMPTS
-- times across runs, and lets us widen the lookback to include rows that
-- were attempted-but-not-yet-emailed.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS email_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS last_email_attempt_at TIMESTAMPTZ;

-- Partial index — most rows have already been emailed (or are read), so
-- a partial keeps the retry-scan tight even as table grows.
CREATE INDEX IF NOT EXISTS idx_notifications_pending_email
  ON notifications(created_at DESC)
  WHERE emailed_at IS NULL AND email_attempts < 3;
