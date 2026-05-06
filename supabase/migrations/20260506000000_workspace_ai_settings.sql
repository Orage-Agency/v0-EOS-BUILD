-- ═══════════════════════════════════════════════════════════
-- 20260506000000_workspace_ai_settings.sql
--
-- Per-workspace AI configuration so /settings/ai actually does something.
-- The settings UI used to write to a Zustand store nobody read; the AI
-- chat route hardcoded openai/gpt-5-mini and ignored everything else.
-- This column persists model, context scope, and voice/tone — the chat
-- route now reads it on every request.
--
-- ai_conversations: durable per-user conversation history so the
-- implementer can recall past turns across sessions / devices. Replaces
-- the pure-in-memory `history` array the client used to send up.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS ai_settings jsonb NOT NULL DEFAULT '{
    "model": "gpt-5-mini",
    "context_scope": "full",
    "voice_tone": "direct"
  }'::jsonb;

COMMENT ON COLUMN workspaces.ai_settings IS
  'Per-workspace AI implementer configuration. Read by /api/ai/chat on every request. Shape: { model, context_scope, voice_tone }.';

-- Note: an `ai_conversations` table already exists from an earlier
-- iteration (single-row-of-messages shape: id, user_id, tenant_id,
-- messages jsonb, started_at, last_message_at). Don't fight it — namespace
-- the new threaded-history tables under ai_chat_* so future readers can
-- tell at a glance which is which.
CREATE TABLE IF NOT EXISTS ai_chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  -- Optional structured payload for tool-calls or attachments.
  tool_calls JSONB,
  tokens_in INTEGER,
  tokens_out INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_user
  ON ai_chat_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_threads_workspace
  ON ai_chat_threads(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_thread
  ON ai_chat_messages(thread_id, created_at);

-- Bump thread.updated_at when a new message lands so the sidebar list
-- orders correctly.
CREATE OR REPLACE FUNCTION bump_ai_chat_thread_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE ai_chat_threads
    SET updated_at = NEW.created_at
    WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_chat_messages_bump_thread ON ai_chat_messages;
CREATE TRIGGER ai_chat_messages_bump_thread
  AFTER INSERT ON ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION bump_ai_chat_thread_updated_at();

-- RLS — user can read/write their own threads only; service role
-- bypasses for the chat route.
ALTER TABLE ai_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_chat_threads_owner ON ai_chat_threads;
CREATE POLICY ai_chat_threads_owner ON ai_chat_threads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ai_chat_messages_owner ON ai_chat_messages;
CREATE POLICY ai_chat_messages_owner ON ai_chat_messages
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
