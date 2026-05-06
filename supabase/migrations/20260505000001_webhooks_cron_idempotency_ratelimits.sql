-- ═══════════════════════════════════════════════════════════
-- 20260505000001_webhooks_cron_idempotency_ratelimits.sql
--
-- Three pieces of "be a real system" for the public API/webhook stack:
--
-- 1. Run /api/cron/webhook-delivery every minute via pg_cron + pg_net,
--    instead of waiting for Vercel Hobby's once-a-day cron. The inline
--    delivery path in lib/webhooks.ts keeps the happy path sub-second
--    already; this guarantees retries fire on the documented backoff
--    ladder (30s → 2m → 8m → 30m → 2h) instead of getting stranded for
--    24 hours when the consumer is briefly down.
--
-- 2. idempotency_keys — public API POST endpoints can opt into
--    Stripe-style Idempotency-Key handling. Same key + same body =
--    return the prior response; same key + different body = 422.
--
-- 3. api_rate_limits — Postgres-backed leaky bucket for /api/v1/*
--    requests. Free tier has no Redis; this counter table is fine
--    until we cross ~10 req/sec sustained.
-- ═══════════════════════════════════════════════════════════

-- ─── pg_cron extension (usually pre-enabled on Supabase) ───
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ─── Webhook delivery cron (runs every minute) ───
-- The function below is what pg_cron actually invokes; it pokes the
-- Vercel cron endpoint with the bearer secret. We keep both this and
-- the Vercel-scheduled daily cron — pg_cron is the authoritative
-- minute-level driver, the Vercel daily entry is a belt-and-suspenders
-- safety net in case pg_cron is paused.
--
-- Config (app_url + cron_secret) lives in `app_settings` because Supabase
-- doesn't grant ALTER DATABASE ... SET to the project's connect role, so
-- a GUC-based config is a non-starter. RLS off — only the SECURITY
-- DEFINER function below reads it; service role is the only client that
-- writes to it (via scripts/apply-migrations.mjs).
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_settings_no_access ON app_settings;
CREATE POLICY app_settings_no_access ON app_settings FOR ALL USING (false);

CREATE OR REPLACE FUNCTION trigger_webhook_delivery()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  app_url text;
  cron_secret text;
  http_req_id bigint;
BEGIN
  SELECT value INTO app_url FROM app_settings WHERE key = 'app_url';
  SELECT value INTO cron_secret FROM app_settings WHERE key = 'cron_secret';
  IF app_url IS NULL OR cron_secret IS NULL THEN
    RAISE NOTICE 'trigger_webhook_delivery: app_settings missing app_url or cron_secret, skipping';
    RETURN;
  END IF;
  SELECT extensions.http_get(
    url := app_url || '/api/cron/webhook-delivery',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'User-Agent', 'pg_cron/orage-core'
    )
  ) INTO http_req_id;
  -- pg_net returns a request id; we don't await — fire-and-forget.
  PERFORM http_req_id;
END;
$$;

-- Schedule it. cron.schedule is idempotent on (jobname); calling again
-- replaces the existing schedule.
DO $$
BEGIN
  -- Drop any prior schedule so re-running this migration is safe.
  PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'orage-webhook-delivery';
EXCEPTION WHEN OTHERS THEN
  -- pg_cron may not be installed on this database — log and continue.
  RAISE NOTICE 'pg_cron unschedule failed: %', SQLERRM;
END $$;

DO $$
BEGIN
  PERFORM cron.schedule(
    'orage-webhook-delivery',
    '* * * * *',
    $cron$ SELECT trigger_webhook_delivery(); $cron$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron schedule failed (extension probably unavailable): %', SQLERRM;
END $$;

-- ─── Idempotency keys ───
CREATE TABLE IF NOT EXISTS idempotency_keys (
  -- The caller-provided key, scoped by API key so two different callers
  -- can use the same idempotency key string without colliding.
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  -- SHA-256 of the request body so we can detect "same key, different
  -- payload" and surface a 422 instead of silently replaying.
  body_hash TEXT NOT NULL,
  -- Cached response we replay on a second hit.
  status_code INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (api_key_id, key)
);

-- Garbage-collect anything older than 24 hours so the table doesn't
-- balloon. Stripe uses 24h too — long enough for the longest realistic
-- retry storm, short enough to keep storage bounded.
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON idempotency_keys(created_at);

-- ─── API rate limits ───
-- One row per (api_key_id, window_start) bucket. Inserts use UPSERT
-- with `count = count + 1`; lookups sum the last hour's buckets.
CREATE TABLE IF NOT EXISTS api_rate_limits (
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  -- Truncated to the minute — gives us 1-minute granularity for free.
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window
  ON api_rate_limits(window_start);

-- Ergonomic helper for the rate-limit middleware: bump the current
-- minute's bucket and return the count for the trailing 60 minutes.
CREATE OR REPLACE FUNCTION increment_api_rate_limit(
  p_api_key_id UUID,
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(hour_count INTEGER, minute_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
  bucket TIMESTAMPTZ := date_trunc('minute', p_now);
BEGIN
  INSERT INTO api_rate_limits (api_key_id, window_start, count)
    VALUES (p_api_key_id, bucket, 1)
    ON CONFLICT (api_key_id, window_start)
    DO UPDATE SET count = api_rate_limits.count + 1;

  RETURN QUERY
  SELECT
    COALESCE(SUM(count)::int, 0) AS hour_count,
    COALESCE(MAX(count) FILTER (WHERE window_start = bucket)::int, 0) AS minute_count
  FROM api_rate_limits
  WHERE api_key_id = p_api_key_id
    AND window_start > p_now - INTERVAL '1 hour';
END;
$$;
