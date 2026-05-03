-- AI rate-limit ledger.
--
-- Each row is one AI request. The /api/ai/chat handler INSERTs a row on
-- entry and refuses to proceed if the user has more than the per-window
-- threshold already. Old rows can be pruned by a cron — they're only used
-- for windowed counting.

CREATE TABLE IF NOT EXISTS ai_request_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_request_log_user_recent
  ON ai_request_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_request_log_tenant_recent
  ON ai_request_log (tenant_id, created_at DESC);

-- The handler writes via the service-role client, so RLS just needs to be
-- on (deny by default) for safety. Reads only happen from server code.
ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;
