"use server"

/**
 * Orage Core · Scorecard server actions
 */

import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"
import { upsertScorecardEntry } from "@/lib/scorecard-server"

export type CreateMetricInput = {
  name: string
  unit: string
  target: number
  direction: "up" | "down"
  ownerId: string
  group: string
  source: "manual" | "stripe" | "ghl" | "n8n" | "ai"
}

export async function createMetric(
  workspaceSlug: string,
  input: CreateMetricInput,
): Promise<{ ok: boolean; id: string; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "scorecard:write")
    const name = input.name.trim()
    if (!name) return { ok: false, id: "", error: "Name is required." }

    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("scorecard_metrics")
      .insert({
        tenant_id: user.workspaceId,
        name,
        unit: input.unit || null,
        goal_value: input.target,
        goal_op: input.direction === "down" ? "<=" : ">=",
        frequency: "weekly",
        display_order: 99,
      })
      .select("id")
      .single()

    if (error || !data) return { ok: false, id: "", error: error?.message ?? "Insert failed" }
    await logAudit({
      user,
      action: "create",
      entityType: "scorecard_metric",
      entityId: (data as { id: string }).id,
      metadata: { name, unit: input.unit, target: input.target, direction: input.direction },
    })
    return { ok: true, id: (data as { id: string }).id }
  } catch (err) {
    return { ok: false, id: "", error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export type UpdateMetricValueInput = {
  metricId: string
  metricOwnerId: string
  week: string
  value: number | null
}

export async function updateMetricValue(
  workspaceSlug: string,
  input: UpdateMetricValueInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser(workspaceSlug)
  const isEditor =
    user.isMaster || ["founder", "admin", "leader"].includes(user.role)
  const isOwner =
    user.role === "member" && input.metricOwnerId === user.id
  if (!isEditor && !isOwner) {
    return { ok: false, error: "Forbidden: you can only edit metrics you own." }
  }
  const result = await upsertScorecardEntry(workspaceSlug, input.metricId, input.week, input.value)
  if (!result.ok) {
    console.error("[v0] updateMetricValue upsert failed", result.error)
  }
  return result
}

/**
 * Update a metric's weekly value during an L10 meeting. Only leader+
 * can run an L10, so we don't enforce the per-metric owner check that
 * `updateMetricValue` does — the leader speaks for the team here.
 */
export async function updateMetricValueDuringL10(
  workspaceSlug: string,
  metricId: string,
  week: string,
  value: number | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "scorecard:write")
    const result = await upsertScorecardEntry(workspaceSlug, metricId, week, value)
    if (result.ok) {
      await logAudit({
        user,
        action: "update",
        entityType: "scorecard_entry",
        entityId: metricId,
        metadata: { week, value, source: "l10" },
      })
    }
    return result
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteMetric(
  workspaceSlug: string,
  metricId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "scorecard:delete")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("scorecard_metrics")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", metricId)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    await logAudit({
      user,
      action: "archive",
      entityType: "scorecard_metric",
      entityId: metricId,
    })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
