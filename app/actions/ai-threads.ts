"use server"

import { requireUser } from "@/lib/auth"
import {
  listThreads,
  loadThreadMessages,
  type ChatThreadRow,
} from "@/lib/ai/threads"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logError } from "@/lib/log"

/**
 * Server actions backing the AI implementer's thread sidebar. The
 * threads + messages tables were created in 20260506000000 and the
 * chat route already persists every turn — these actions surface the
 * data to the client so the user can switch between past threads.
 */

export type ThreadListItem = {
  id: string
  title: string
  preview: string
  updatedAt: string
}

export async function listMyThreads(
  workspaceSlug: string,
  limit = 30,
): Promise<{ ok: true; threads: ThreadListItem[] } | { ok: false; error: string }> {
  try {
    const me = await requireUser(workspaceSlug)
    const rows = await listThreads(me.workspaceId, me.id, limit)
    if (rows.length === 0) return { ok: true, threads: [] }
    // Pull a one-line preview (the most recent message content) per
    // thread so the sidebar shows context, not just titles.
    const sb = supabaseAdmin()
    const ids = rows.map((r) => r.id)
    const { data: previews } = await sb
      .from("ai_chat_messages")
      .select("thread_id, content, created_at")
      .in("thread_id", ids)
      .order("created_at", { ascending: false })
    const lastByThread = new Map<string, string>()
    for (const m of (previews ?? []) as Array<{ thread_id: string; content: string }>) {
      if (!lastByThread.has(m.thread_id)) {
        lastByThread.set(m.thread_id, m.content)
      }
    }
    const threads = rows.map((r: ChatThreadRow) => ({
      id: r.id,
      title: r.title ?? "Untitled",
      preview: (lastByThread.get(r.id) ?? "").slice(0, 140),
      updatedAt: r.updated_at,
    }))
    return { ok: true, threads }
  } catch (err) {
    logError("listMyThreads failed", err)
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function loadThread(
  workspaceSlug: string,
  threadId: string,
): Promise<
  | {
      ok: true
      thread: { id: string; title: string }
      messages: Array<{
        id: string
        role: "user" | "assistant" | "system"
        content: string
        createdAt: string
      }>
    }
  | { ok: false; error: string }
> {
  try {
    const me = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { data: thread } = await sb
      .from("ai_chat_threads")
      .select("id, title")
      .eq("id", threadId)
      .eq("workspace_id", me.workspaceId)
      .eq("user_id", me.id)
      .maybeSingle()
    if (!thread) return { ok: false, error: "Thread not found" }
    const messages = await loadThreadMessages(threadId, me.workspaceId, me.id, 200)
    return {
      ok: true,
      thread: { id: thread.id as string, title: (thread.title as string) ?? "Untitled" },
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

/**
 * Rename a saved thread. Trim + cap to 200 chars so the sidebar list
 * doesn't break layout if a user pastes a wall of text.
 */
export async function renameThread(
  workspaceSlug: string,
  threadId: string,
  title: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const me = await requireUser(workspaceSlug)
    const trimmed = title.trim().slice(0, 200)
    if (!trimmed) return { ok: false, error: "Title cannot be empty" }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("ai_chat_threads")
      .update({ title: trimmed })
      .eq("id", threadId)
      .eq("workspace_id", me.workspaceId)
      .eq("user_id", me.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/${workspaceSlug}/ai`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}

export async function deleteThread(
  workspaceSlug: string,
  threadId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const me = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("ai_chat_threads")
      .delete()
      .eq("id", threadId)
      .eq("workspace_id", me.workspaceId)
      .eq("user_id", me.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath(`/${workspaceSlug}/ai`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}
