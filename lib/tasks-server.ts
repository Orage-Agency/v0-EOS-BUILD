/**
 * Orage Core · Tasks server-side data helpers
 *
 * These run inside Server Components and Route Handlers. Anything that
 * imports this module is server-only — the `supabaseAdmin()` client is
 * never shipped to the browser.
 *
 * Conversions: DB row → `MockTask` shape so the existing client store,
 * row component, and helpers don't need to change for persistence.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"
import {
  UNASSIGNED_OWNER_ID,
  type MockTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/mock-data"
import type { DbTask } from "@/lib/db-types"
import { logError } from "@/lib/log"

// ----------------------------------------------------------- conversions

function dbToMockTask(row: DbTask): MockTask {
  return {
    id: row.id,
    title: row.title,
    owner: row.owner_id ?? UNASSIGNED_OWNER_ID,
    createdBy: row.created_by ?? undefined,
    status: row.status,
    priority: row.priority,
    due: row.due_date ? row.due_date.slice(0, 10) : "",
    rockId: row.parent_rock_id ?? undefined,
    completed: row.completed_at ? row.completed_at.slice(0, 10) : undefined,
    description: row.description ?? undefined,
    clientWorkspaceId: row.client_workspace_id ?? null,
  }
}

// ----------------------------------------------------------- list tasks

export async function listTasksForWorkspace(
  workspaceSlug: string,
): Promise<MockTask[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("tasks")
      .select("*")
      .eq("tenant_id", user.workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
    if (error) {
      logError("listTasksForWorkspace error", error.message)
      return []
    }
    return ((data as DbTask[] | null) ?? []).map(dbToMockTask)
  } catch (err) {
    logError("listTasksForWorkspace exception", err)
    return []
  }
}

// ----------------------------------------------------------- list members

export type WorkspaceMember = {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  initials: string
  role: string
  color: string | null
}

function deriveInitials(name: string, email: string): string {
  const source = name?.trim() || email
  const parts = source.split(/\s+|@/).filter(Boolean)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export async function listWorkspaceMembers(
  workspaceSlug: string,
): Promise<WorkspaceMember[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()

    // Two-step query — see lib/people-server.ts for why we don't trust
    // the PostgREST `profiles:profiles!inner(...)` alias here.
    const { data: memberships, error: mErr } = await sb
      .from("workspace_memberships")
      .select("user_id, role")
      .eq("workspace_id", user.workspaceId)
      .eq("status", "active")
    if (mErr) {
      logError("tasks-server listWorkspaceMembers memberships error", mErr.message)
      return []
    }
    const rows = (memberships ?? []) as Array<{ user_id: string; role: string }>
    if (rows.length === 0) return []

    const ids = rows.map((r) => r.user_id).filter(Boolean)
    const { data: profiles, error: pErr } = await sb
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .in("id", ids)
    if (pErr) {
      logError("tasks-server listWorkspaceMembers profiles error", pErr.message)
      return []
    }
    const byId = new Map(
      ((profiles ?? []) as Array<{
        id: string
        email: string
        full_name: string | null
        avatar_url: string | null
      }>).map((p) => [p.id, p]),
    )

    // Best-effort: pull avatar_color separately so a missing column in an
    // older env doesn't break the whole select.
    let colorById = new Map<string, string | null>()
    try {
      const { data: colors } = await sb
        .from("profiles")
        .select("id, avatar_color")
        .in("id", ids)
      colorById = new Map(
        ((colors ?? []) as Array<{ id: string; avatar_color: string | null }>).map(
          (r) => [r.id, r.avatar_color],
        ),
      )
    } catch {
      /* ignore — column missing */
    }

    return rows.flatMap((m) => {
      const p = byId.get(m.user_id)
      if (!p) return []
      const name = p.full_name ?? p.email
      return [
        {
          id: p.id,
          name,
          email: p.email,
          avatarUrl: p.avatar_url,
          initials: deriveInitials(p.full_name ?? "", p.email),
          role: m.role,
          color: colorById.get(p.id) ?? null,
        } satisfies WorkspaceMember,
      ]
    })
  } catch (err) {
    logError("listWorkspaceMembers exception", err)
    return []
  }
}

// ----------------------------------------------------------- list rocks

export type RockOption = {
  id: string
  title: string
  quarter: string
  tag: string | null
}

export async function listActiveRocks(
  workspaceSlug: string,
): Promise<RockOption[]> {
  const user = await requireUser(workspaceSlug)
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from("rocks")
      .select("id, title, quarter, status, tag")
      .eq("tenant_id", user.workspaceId)
      .neq("status", "done")
      .order("created_at", { ascending: false })
    if (error) {
      logError("listActiveRocks error", error.message)
      return []
    }
    type R = { id: string; title: string; quarter: string; tag: string | null }
    return ((data as R[] | null) ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      quarter: r.quarter,
      tag: r.tag ?? null,
    }))
  } catch (err) {
    logError("listActiveRocks exception", err)
    return []
  }
}

// ----------------------------------------------------------- type re-exports

export type { MockTask, TaskPriority, TaskStatus }
