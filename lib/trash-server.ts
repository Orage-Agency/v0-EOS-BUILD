import "server-only"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type TrashItem = {
  id: string
  kind: "rock" | "task" | "issue" | "note"
  title: string
  deletedAt: string
}

/**
 * List soft-deleted rows across the workspace's first-class entities.
 * Sorted newest-first so the most recent mistake is easiest to undo.
 */
export async function listTrash(workspaceSlug: string): Promise<TrashItem[]> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const tenantId = user.workspaceId
    const [rocks, tasks, issues, notes] = await Promise.all([
      sb
        .from("rocks")
        .select("id, title, deleted_at")
        .eq("tenant_id", tenantId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      sb
        .from("tasks")
        .select("id, title, deleted_at")
        .eq("tenant_id", tenantId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      sb
        .from("issues")
        .select("id, title, deleted_at")
        .eq("tenant_id", tenantId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
      sb
        .from("notes")
        .select("id, title, deleted_at")
        .eq("tenant_id", tenantId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false }),
    ])

    const out: TrashItem[] = []
    type Row = { id: string; title: string | null; deleted_at: string }
    for (const r of (rocks.data ?? []) as Row[]) {
      out.push({
        id: r.id,
        kind: "rock",
        title: r.title ?? "Untitled rock",
        deletedAt: r.deleted_at,
      })
    }
    for (const t of (tasks.data ?? []) as Row[]) {
      out.push({
        id: t.id,
        kind: "task",
        title: t.title ?? "Untitled task",
        deletedAt: t.deleted_at,
      })
    }
    for (const i of (issues.data ?? []) as Row[]) {
      out.push({
        id: i.id,
        kind: "issue",
        title: i.title ?? "Untitled issue",
        deletedAt: i.deleted_at,
      })
    }
    for (const n of (notes.data ?? []) as Row[]) {
      out.push({
        id: n.id,
        kind: "note",
        title: n.title ?? "Untitled note",
        deletedAt: n.deleted_at,
      })
    }
    return out.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
  } catch {
    return []
  }
}
