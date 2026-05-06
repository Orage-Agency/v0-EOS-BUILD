"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import {
  ALLOWED_AI_MODELS,
  DEFAULT_AI_SETTINGS,
  type AIModelId,
  type AISettings,
} from "@/lib/ai-settings"

/**
 * Per-workspace AI configuration. Persisted on workspaces.ai_settings
 * (jsonb). Read by the chat route on every request so a model swap is
 * effective immediately — no redeploy.
 *
 * IMPORTANT: this file is a "use server" module — Next 16 only allows
 * async function exports here. Types + DEFAULT_AI_SETTINGS live in
 * lib/ai-settings.ts so the constants are reusable from client and
 * server without breaking the production build.
 */

function fromRow(raw: unknown): AISettings {
  const row = (raw ?? {}) as Record<string, unknown>
  const model = ALLOWED_AI_MODELS.includes(row.model as AIModelId)
    ? (row.model as AIModelId)
    : DEFAULT_AI_SETTINGS.model
  const contextScope = (
    ["full", "operational", "minimal"] as AISettings["contextScope"][]
  ).includes(row.context_scope as AISettings["contextScope"])
    ? (row.context_scope as AISettings["contextScope"])
    : DEFAULT_AI_SETTINGS.contextScope
  const voiceTone = (
    ["direct", "coaching", "concise", "custom"] as AISettings["voiceTone"][]
  ).includes(row.voice_tone as AISettings["voiceTone"])
    ? (row.voice_tone as AISettings["voiceTone"])
    : DEFAULT_AI_SETTINGS.voiceTone
  return { model, contextScope, voiceTone }
}

function toRow(s: AISettings) {
  return {
    model: s.model,
    context_scope: s.contextScope,
    voice_tone: s.voiceTone,
  }
}

export async function getAISettings(
  workspaceSlug: string,
): Promise<AISettings> {
  const user = await requireUser(workspaceSlug)
  const sb = supabaseAdmin()
  const { data } = await sb
    .from("workspaces")
    .select("ai_settings")
    .eq("id", user.workspaceId)
    .maybeSingle()
  return fromRow(data?.ai_settings)
}

export type AIUsageSummary = {
  /** Trailing-30-day token totals across the workspace, all models. */
  totalTokensIn: number
  totalTokensOut: number
  totalMessages: number
  /** Per-model breakdown so admins can see where the spend lives. */
  byModel: Array<{
    model: string | null
    tokensIn: number
    tokensOut: number
    messages: number
  }>
  /** Trailing-30-day spend bucket count, indexed by ISO date string. */
  byDay: Record<string, { tokensIn: number; tokensOut: number; messages: number }>
}

/**
 * Aggregate the workspace's AI usage over the last 30 days. Returns
 * zeros if no usage rows exist yet — the dashboard renders an empty
 * state rather than a broken chart.
 *
 * Reads ai_chat_messages directly because the chat route stamps
 * tokens_in / tokens_out on every assistant turn. We aggregate
 * client-side rather than via PostgREST aggregations because the
 * SDK's group-by support is fiddly and the row count is small
 * (typical workspace: <1000 rows / 30 days).
 */
export async function getAIUsage(
  workspaceSlug: string,
): Promise<AIUsageSummary> {
  const user = await requireUser(workspaceSlug)
  const sb = supabaseAdmin()
  const since = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString()

  // Tool calls don't bill — we only count assistant messages.
  // We don't have a model column on ai_chat_messages today, so per-model
  // breakdown will be empty until a future migration adds it. Return
  // the structure regardless so the UI can render zero state cleanly.
  const { data } = await sb
    .from("ai_chat_messages")
    .select("tokens_in, tokens_out, created_at, role")
    .eq("workspace_id", user.workspaceId)
    .eq("role", "assistant")
    .gte("created_at", since)
    .limit(50_000)

  const rows = (data ?? []) as Array<{
    tokens_in: number | null
    tokens_out: number | null
    created_at: string
  }>

  let totalIn = 0
  let totalOut = 0
  const byDay: AIUsageSummary["byDay"] = {}
  for (const r of rows) {
    const tIn = r.tokens_in ?? 0
    const tOut = r.tokens_out ?? 0
    totalIn += tIn
    totalOut += tOut
    const day = r.created_at.slice(0, 10)
    const bucket = byDay[day] ?? { tokensIn: 0, tokensOut: 0, messages: 0 }
    bucket.tokensIn += tIn
    bucket.tokensOut += tOut
    bucket.messages += 1
    byDay[day] = bucket
  }

  return {
    totalTokensIn: totalIn,
    totalTokensOut: totalOut,
    totalMessages: rows.length,
    byModel: [], // populated once we add model column to ai_chat_messages
    byDay,
  }
}

export async function saveAISettings(
  workspaceSlug: string,
  patch: Partial<AISettings>,
): Promise<{ ok: true; settings: AISettings } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "tenants:admin")
    const sb = supabaseAdmin()
    const current = fromRow(
      (
        await sb
          .from("workspaces")
          .select("ai_settings")
          .eq("id", user.workspaceId)
          .maybeSingle()
      ).data?.ai_settings,
    )
    const next: AISettings = { ...current, ...patch }
    if (!ALLOWED_AI_MODELS.includes(next.model)) {
      return { ok: false, error: `Unknown model: ${next.model}` }
    }
    const { error } = await sb
      .from("workspaces")
      .update({ ai_settings: toRow(next) })
      .eq("id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    await logAudit({
      user,
      action: "update",
      entityType: "tenant",
      entityId: user.workspaceId,
      metadata: { kind: "ai_settings", model: next.model },
    })
    revalidatePath(`/${workspaceSlug}/settings/ai`)
    return { ok: true, settings: next }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown" }
  }
}
