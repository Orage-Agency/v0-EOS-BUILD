"use server"

/**
 * Orage Core · Scorecard server actions
 * Inputs no longer carry actor / tenantId — auth is derived from the session.
 */

import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"

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
) {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "scorecard:write")
  if (!input.name.trim()) throw new Error("Name is required.")
  console.log("[v0] createMetric", { name: input.name })
  return { ok: true as const, id: `m_${Date.now()}` }
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
) {
  const user = await requireUser(workspaceSlug)
  // Members can only edit metrics they own; founders/admins/leaders can edit any.
  const isEditor =
    user.isMaster || ["founder", "admin", "leader"].includes(user.role)
  const isOwner =
    user.role === "member" && input.metricOwnerId === user.id
  if (!isEditor && !isOwner) {
    throw new Error("Forbidden: you can only edit metrics you own.")
  }
  console.log("[v0] updateMetricValue", input)
  return { ok: true as const }
}

export async function deleteMetric(workspaceSlug: string, metricId: string) {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "scorecard:delete")
  console.log("[v0] deleteMetric", metricId)
  return { ok: true as const }
}
