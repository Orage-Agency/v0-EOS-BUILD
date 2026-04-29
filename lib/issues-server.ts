/**
 * Orage Core · Issues server-side data helpers
 * Server-only; never imported by client components.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import type { DbIssue } from "@/lib/db-types"
import type { Issue } from "@/lib/issues-seed"

function ageLabel(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return "TODAY"
  if (diffDays === 1) return "1D AGO"
  if (diffDays < 7) return `${diffDays}D AGO`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks}W AGO`
}

function dbToIssue(row: DbIssue): Issue {
  const queue: Issue["queue"] =
    row.status === "solved" ? "solved" :
    row.status === "dropped" ? "tabled" :
    "open"

  return {
    id: row.id,
    title: row.title,
    context: row.description ?? "",
    severity: row.severity ?? "normal",
    stage: row.stage ?? "identify",
    source: row.ai_generated ? "ai" : "user",
    sourceLabel: row.ai_generated ? "AI IMPLEMENTER" : "USER",
    ownerId: row.owner_id ?? "",
    createdAt: row.created_at,
    ageLabel: ageLabel(row.created_at),
    rank: row.rank ?? 999,
    queue,
    pinnedForL10: row.pinned_for_l10 ?? false,
    linkedRockId: row.linked_rock_id ?? undefined,
    activity: [],
  }
}

export async function listIssuesForWorkspace(workspaceSlug: string): Promise<Issue[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("issues")
      .select("*")
      .eq("tenant_id", user.workspaceId)
      .order("rank", { ascending: true, nullsFirst: false })
    if (error) {
      console.error("[v0] listIssuesForWorkspace error", error.message)
      return []
    }
    return ((data as DbIssue[] | null) ?? []).map(dbToIssue)
  } catch (err) {
    console.error("[v0] listIssuesForWorkspace exception", err)
    return []
  }
}
