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
