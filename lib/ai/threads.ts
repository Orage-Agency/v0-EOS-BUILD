import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Durable per-user chat-thread store for the AI Implementer.
 *
 * Lives separate from the older `ai_conversations` table (which stored
 * the whole convo as a single jsonb blob) — the threaded shape lets the
 * client stream individual messages, render a sidebar list, and let
 * users jump between threads without re-loading the full history.
 *
 * Auth model: rows are scoped by (workspace_id, user_id). Reads + writes
 * always go through service role from server actions; RLS on the table
 * restricts direct cross-user access.
 */

export type ChatThreadRow = {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export type ChatMessageRow = {
  id: string
  thread_id: string
  role: "user" | "assistant" | "system"
  content: string
  tool_calls: unknown
  created_at: string
}

export async function listThreads(
  workspaceId: string,
  userId: string,
  limit = 30,
): Promise<ChatThreadRow[]> {
  const sb = supabaseAdmin()
  const { data } = await sb
    .from("ai_chat_threads")
    .select("id, title, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit)
  return ((data ?? []) as ChatThreadRow[]) ?? []
}

export async function loadThreadMessages(
  threadId: string,
  workspaceId: string,
  userId: string,
  limit = 100,
): Promise<ChatMessageRow[]> {
  const sb = supabaseAdmin()
  // Scope is enforced via the join — never trust the threadId alone.
  const { data: thread } = await sb
    .from("ai_chat_threads")
    .select("id")
    .eq("id", threadId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle()
  if (!thread) return []
  const { data } = await sb
    .from("ai_chat_messages")
    .select("id, thread_id, role, content, tool_calls, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit)
  return ((data ?? []) as ChatMessageRow[]) ?? []
}

export async function ensureThread(
  workspaceId: string,
  userId: string,
  threadId: string | null,
  firstUserMessage: string,
): Promise<string> {
  const sb = supabaseAdmin()
  if (threadId) {
    const { data } = await sb
      .from("ai_chat_threads")
      .select("id")
      .eq("id", threadId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle()
    if (data) return data.id as string
  }
  const title = firstUserMessage.trim().slice(0, 80) || "New thread"
  const { data, error } = await sb
    .from("ai_chat_threads")
    .insert({ workspace_id: workspaceId, user_id: userId, title })
    .select("id")
    .single()
  if (error || !data) throw error ?? new Error("Failed to create thread")
  return data.id as string
}

export async function appendMessage(args: {
  threadId: string
  workspaceId: string
  userId: string
  role: "user" | "assistant" | "system"
  content: string
  toolCalls?: unknown
  tokensIn?: number | null
  tokensOut?: number | null
  /** AI Gateway model id used for this turn — e.g. "openai/gpt-5-mini". */
  model?: string | null
}): Promise<void> {
  const sb = supabaseAdmin()
  await sb.from("ai_chat_messages").insert({
    thread_id: args.threadId,
    workspace_id: args.workspaceId,
    user_id: args.userId,
    role: args.role,
    content: args.content,
    tool_calls: args.toolCalls ?? null,
    tokens_in: args.tokensIn ?? null,
    tokens_out: args.tokensOut ?? null,
    model: args.model ?? null,
  })
}
