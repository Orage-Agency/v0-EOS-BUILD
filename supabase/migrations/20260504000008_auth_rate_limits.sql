-- ════════════════════════════════════════════════════════════════════════
-- Auth route rate limiting (per-IP)
-- ════════════════════════════════════════════════════════════════════════
-- Public auth endpoints (signup / login / magic-link / accept-invite) had
-- no throttle, which meant they were trivial credential-stuffing and
-- email-enumeration targets. This table records every attempt keyed by
-- IP + endpoint with a created_at timestamp. The helper in
-- lib/auth-rate-limit.ts counts rows in the recent window before letting
-- the next attempt through.
--
-- Old rows are pruned by the same helper opportunistically — there's no
-- separate cleanup cron, just `WHERE created_at >= now() - interval`.

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_window
  ON auth_rate_limits(ip, endpoint, created_at DESC);
