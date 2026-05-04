"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission, type Action } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/audit"

const KIND_TABLE: Record<"rock" | "task" | "issue" | "note", string> = {
  rock: "rocks",
  task: "tasks",
  issue: "issues",
  note: "notes",
}

const KIND_PERMISSION: Record<"rock" | "task" | "issue" | "note", Action> = {
  rock: "rocks:write",
  task: "tasks:write",
  issue: "issues:write",
  note: "notes:write",
}

const KIND_DELETE_PERMISSION: Record<"rock" | "task" | "issue" | "note", Action> = {
  rock: "rocks:delete",
  task: "tasks:delete",
  issue: "issues:delete",
  note: "notes:delete",
}

export async function restoreFromTrash(
  workspaceSlug: string,
  kind: "rock" | "task" | "issue" | "note",
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, KIND_PERMISSION[kind])
    const sb = supabaseAdmin()
    const { error } = await sb
      .from(KIND_TABLE[kind])
      .update({ deleted_at: null })
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    await logAudit({
      user,
      action: "restore",
      entityType: kind,
      entityId: id,
    })
    revalidatePath(`/${workspaceSlug}/trash`)
    revalidatePath(`/${workspaceSlug}`)
    revalidatePath(`/${workspaceSlug}/${kind === "note" ? "notes" : `${kind}s`}`)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}

/**
 * Hard-delete from trash — actually wipes the row. Permission-gated to
 * the role that could delete it in the first place. Use sparingly; the
 * default 30-day soft-delete window is the right answer for accidents.
 */
export async function purgeFromTrash(
  workspaceSlug: string,
  kind: "rock" | "task" | "issue" | "note",
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, KIND_DELETE_PERMISSION[kind])
    const sb = supabaseAdmin()
    const { error } = await sb
      .from(KIND_TABLE[kind])
      .delete()
      .eq("id", id)
      .eq("tenant_id", user.workspaceId)
    if (error) return { ok: false, error: error.message }
    await logAudit({
      user,
      action: "purge",
      entityType: kind,
      entityId: id,
    })
    revalidatePath(`/${workspaceSlug}/trash`)
    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    return { ok: false, error: msg }
  }
}
