-- ═══════════════════════════════════════════════════════════
-- 20260506000002_ai_chat_messages_model.sql
--
-- Add a `model` column to ai_chat_messages so the AI usage card's
-- per-model breakdown can do its job. The chat route stamps every
-- assistant turn with the model id used (openai/gpt-5-mini,
-- anthropic/claude-opus-4-7, etc.) — this column is what the
-- /settings/ai dashboard reads to group spend by provider.
--
-- Nullable on purpose: existing pre-migration rows don't have a model
-- attribution. The dashboard treats null as "unknown" and rolls them
-- into a single bucket.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE ai_chat_messages
  ADD COLUMN IF NOT EXISTS model TEXT;

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_workspace_model_day
  ON ai_chat_messages(workspace_id, model, created_at DESC)
  WHERE role = 'assistant';

COMMENT ON COLUMN ai_chat_messages.model IS
  'AI Gateway model id used for this assistant turn (e.g. openai/gpt-5-mini). Null on rows that predate this column.';
