"use server"

/**
 * Server actions for the Issues module.
 * Authentication via requireUser(workspaceSlug); permission gating via
 * requirePermission against the server-side matrix.
 */

import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"

export type CreateIssueInput = {
  title: string
  context?: string
  severity: "critical" | "high" | "normal" | "low"
  linkedRockId?: string
  pinnedForL10?: boolean
}

export async function createIssue(
  workspaceSlug: string,
  input: CreateIssueInput,
) {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "issues:write")
  if (!input.title.trim()) throw new Error("Title is required.")
  console.log("[v0] createIssue", { workspaceSlug, title: input.title })
  return { ok: true as const, id: `i_${Date.now()}` }
}

export async function updateIssueRanks(
  workspaceSlug: string,
  orderedIds: string[],
) {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "issues:write")
  console.log("[v0] updateIssueRanks", orderedIds)
  return {
    ok: true as const,
    ranks: orderedIds.map((id, i) => ({ id, rank: i + 1 })),
  }
}

export type ResolveIssueInput = {
  issueId: string
  path: "rock" | "task" | "decision" | "headline" | "archive"
  payload: Record<string, unknown>
  reason?: string
}

export async function resolveIssue(
  workspaceSlug: string,
  input: ResolveIssueInput,
) {
  const user = await requireUser(workspaceSlug)
  // Resolving an issue requires leader+ (matches client matrix).
  if (
    !user.isMaster &&
    !["founder", "admin", "leader"].includes(user.role)
  ) {
    throw new Error("Forbidden: only Founder/Admin/Leader can resolve issues.")
  }
  console.log("[v0] resolveIssue", input)
  return { ok: true as const }
}

export async function togglePinForL10(
  workspaceSlug: string,
  issueId: string,
  pinned: boolean,
) {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "issues:write")
  console.log("[v0] togglePinForL10", { issueId, pinned })
  return { ok: true as const }
}

export async function dismissAISuggestion(
  workspaceSlug: string,
  suggestionId: string,
) {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "issues:write")
  console.log("[v0] dismissAISuggestion", suggestionId)
  return { ok: true as const }
}
