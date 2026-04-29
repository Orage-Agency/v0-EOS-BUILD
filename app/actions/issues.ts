"use server"

/**
 * Server actions for the Issues module.
 * Authentication via requireUser(workspaceSlug); permission gating via
 * requirePermission against the server-side matrix.
 */

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"

function revalidateIssueRoutes(workspaceSlug: string) {
  revalidatePath(`/${workspaceSlug}/issues`)
  revalidatePath(`/${workspaceSlug}`)
}

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
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "issues:write")
    const title = input.title.trim()
    if (!title) return { ok: false, error: "Title is required." }

    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("issues")
      .insert({
        tenant_id: user.workspaceId,
        title,
        description: input.context?.trim() || null,
        severity: input.severity,
        stage: "identify",
        pinned_for_l10: input.pinnedForL10 ?? false,
        linked_rock_id: input.linkedRockId ?? null,
        owner_id: user.id,
        status: "open",
        ai_generated: false,
        created_by: user.id,
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("[v0] createIssue insert error", error?.message)
      return { ok: false, error: error?.message ?? "Insert failed" }
    }

    revalidateIssueRoutes(workspaceSlug)
    return { ok: true, id: data.id as string }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("[v0] createIssue exception", msg)
    return { ok: false, error: msg }
  }
}

export async function updateIssueRanks(
  workspaceSlug: string,
  orderedIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "issues:write")
    const sb = supabaseAdmin()
    await Promise.all(
      orderedIds.map((id, i) =>
        sb
          .from("issues")
          .update({ rank: i + 1, updated_at: new Date().toISOString() })
          .eq("id", id)
          .eq("tenant_id", user.workspaceId),
      ),
    )
    revalidateIssueRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
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
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    if (
      !user.isMaster &&
      !["founder", "admin", "leader"].includes(user.role)
    ) {
      return { ok: false, error: "Forbidden: only Founder/Admin/Leader can resolve issues." }
    }
    const sb = supabaseAdmin()
    const newStatus = input.path === "archive" ? "dropped" : "solved"
    const { error } = await sb
      .from("issues")
      .update({
        status: newStatus,
        stage: "solve",
        solution_note: input.reason ?? null,
        solved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.issueId)
      .eq("tenant_id", user.workspaceId)

    if (error) return { ok: false, error: error.message }
    revalidateIssueRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function togglePinForL10(
  workspaceSlug: string,
  issueId: string,
  pinned: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "issues:write")
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("issues")
      .update({ pinned_for_l10: pinned, updated_at: new Date().toISOString() })
      .eq("id", issueId)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    revalidateIssueRoutes(workspaceSlug)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

export async function dismissAISuggestion(
  workspaceSlug: string,
  suggestionId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser(workspaceSlug)
  requirePermission(user, "issues:write")
  console.log("[v0] dismissAISuggestion", suggestionId)
  return { ok: true }
}
