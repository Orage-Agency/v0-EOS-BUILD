-- ════════════════════════════════════════════════════════════════════════
-- Public API: keys + outbound webhooks + delivery log
-- ════════════════════════════════════════════════════════════════════════
-- Per-workspace API keys for the new public REST + MCP surface, and a
-- webhook delivery system so n8n / Zapier / Make can subscribe to
-- workspace events. Both share the api_key auth model — a webhook is
-- created with an HMAC secret used to sign every delivery so the
-- consumer can verify it came from us.

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Display name shown in the management UI (e.g. "n8n production").
  name TEXT NOT NULL,
  -- First 12 chars of the raw key, prefixed with `oc_`. Lets the UI show
  -- something identifying without exposing the full secret on read.
  key_prefix TEXT NOT NULL,
  -- bcrypt hash of the full key. Compared with bcrypt.compare on auth.
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['read','write']::TEXT[],
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON api_keys(workspace_id) WHERE revoked_at IS NULL;
-- Quick lookup by prefix during auth — there'll be many keys per workspace
-- but the prefix is high-cardinality and lets us shrink the bcrypt scan to
-- a single row in the common case.
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- HTTPS URL the consumer wants events POSTed to.
  target_url TEXT NOT NULL,
  -- HMAC secret — we keep the raw value because we need it to sign each
  -- payload (consumer never sees it after the create call returns it
  -- once). Stored in plaintext in the DB; protect via service-role
  -- access + workspace isolation.
  secret TEXT NOT NULL,
  -- Subscribe to specific event types. Empty array = all.
  event_types TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_delivered_at TIMESTAMPTZ,
  last_delivery_status INTEGER,
  consecutive_failures INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_webhooks_workspace ON webhooks(workspace_id) WHERE active;

-- Outbox table — every event creates a row here, the delivery cron picks
-- pending rows and POSTs to webhooks subscribed to that event type.
-- Decouples the producer (server actions) from the network call to the
-- consumer's URL, so a slow webhook doesn't slow user-facing writes.
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  last_status INTEGER,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_pending
  ON webhook_deliveries(next_attempt_at)
  WHERE delivered_at IS NULL AND attempts < 5;
