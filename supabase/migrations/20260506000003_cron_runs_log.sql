-- ═══════════════════════════════════════════════════════════
-- 20260506000003_cron_runs_log.sql
--
-- Lightweight log of every cron tick so master admins can see when
-- each scheduled job last ran and what it did. Each cron route
-- writes a row at the END of its handler (success or failure) so the
-- dashboard surfaces both heartbeat AND result counts.
--
-- Retention: 30 days, dropped via the existing cron-cleanup pattern
-- (added to the daily idempotency-cleanup route since they share a
-- 'sweep stale rows' rhythm).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cron_runs (
  id BIGSERIAL PRIMARY KEY,
  job TEXT NOT NULL,
  ok BOOLEAN NOT NULL,
  duration_ms INTEGER NOT NULL,
  details JSONB,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_job_ran_at
  ON cron_runs(job, ran_at DESC);
