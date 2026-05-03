/**
 * Audit log reader. Server-only — uses the service role to fetch every
 * activity_log row in the workspace, then resolves actor names from
 * profiles in a second query (Supabase's PostgREST FK alias join is flaky
 * on this codebase, see lib/people-server.ts for the same pattern).
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type AuditRow = {
  id: string
  action: string
  entityType: string
  entityId: string
  metadata: Record<string, unknown> | null
  createdAt: string
  actor: {
    id: string | null
    name: string
    email: string | null
  }
}

export async function listAuditForWorkspace(
  workspaceSlug: string,
  opts: { limit?: number; entityType?: string } = {},
): Promise<AuditRow[]> {
  const user = await requireUser(workspaceSlug)
  const sb = supabaseAdmin()
  const limit = Math.min(opts.limit ?? 100, 500)
  let q = sb
    .from("activity_log")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .eq("tenant_id", user.workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (opts.entityType) q = q.eq("entity_type", opts.entityType)
  const { data, error } = await q
  if (error || !data) return []

  const rows = data as Array<{
    id: string
    actor_id: string | null
    action: string
    entity_type: string
    entity_id: string
    metadata: Record<string, unknown> | null
    created_at: string
  }>
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter((v): v is string => Boolean(v))),
  )
  const profilesById = new Map<string, { name: string; email: string }>()
  if (actorIds.length > 0) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id, email, full_name")
      .in("id", actorIds)
    for (const p of (profiles ?? []) as Array<{
      id: string
      email: string
      full_name: string | null
    }>) {
      profilesById.set(p.id, { name: p.full_name ?? p.email, email: p.email })
    }
  }
  return rows.map((r) => {
    const profile = r.actor_id ? profilesById.get(r.actor_id) : null
    return {
      id: r.id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      metadata: r.metadata,
      createdAt: r.created_at,
      actor: {
        id: r.actor_id,
        name: profile?.name ?? "Unknown",
        email: profile?.email ?? null,
      },
    }
  })
}
