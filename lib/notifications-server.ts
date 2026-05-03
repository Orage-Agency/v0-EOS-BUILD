/**
 * Notifications writer + reader. Consumed by server actions that want to
 * fan out an in-app message to a recipient (task assigned, rock owner
 * changed, handoff). The Inbox page reads via listInbox.
 */
import "server-only"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export type NotificationKind =
  | "task_assigned"
  | "rock_owner_changed"
  | "milestone_assigned"
  | "handoff"
  | "mention"
  | "overdue"
  | "invite_accepted"

export type InboxItem = {
  id: string
  kind: string
  title: string
  body: string | null
  link: string | null
  entityType: string
  entityId: string
  readAt: string | null
  createdAt: string
  actor: { id: string | null; name: string }
}

export async function notify(args: {
  tenantId: string
  recipientId: string
  actorId: string | null
  kind: NotificationKind
  entityType: string
  entityId: string
  title: string
  body?: string | null
  link?: string | null
  sourceAuditId?: string | null
}): Promise<void> {
  // Self-notifications are noise: don't ping the user about an action
  // they took themselves.
  if (args.actorId && args.actorId === args.recipientId) return

  const sb = supabaseAdmin()
  const { error } = await sb.from("notifications").insert({
    tenant_id: args.tenantId,
    recipient_id: args.recipientId,
    actor_id: args.actorId,
    source_audit_id: args.sourceAuditId ?? null,
    kind: args.kind,
    entity_type: args.entityType,
    entity_id: args.entityId,
    title: args.title,
    body: args.body ?? null,
    link: args.link ?? null,
  })
  if (error) {
    console.error("[notifications] insert failed", {
      kind: args.kind,
      recipientId: args.recipientId,
      error: error.message,
    })
  }
}

export async function listInbox(
  workspaceSlug: string,
  opts: { limit?: number; unreadOnly?: boolean } = {},
): Promise<InboxItem[]> {
  const user = await requireUser(workspaceSlug)
  const sb = supabaseAdmin()
  const limit = Math.min(opts.limit ?? 50, 200)
  let q = sb
    .from("notifications")
    .select("id, kind, title, body, link, entity_type, entity_id, read_at, created_at, actor_id")
    .eq("recipient_id", user.id)
    .eq("tenant_id", user.workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (opts.unreadOnly) q = q.is("read_at", null)
  const { data } = await q
  if (!data) return []

  const rows = data as Array<{
    id: string
    kind: string
    title: string
    body: string | null
    link: string | null
    entity_type: string
    entity_id: string
    read_at: string | null
    created_at: string
    actor_id: string | null
  }>
  const actorIds = Array.from(
    new Set(rows.map((r) => r.actor_id).filter((v): v is string => Boolean(v))),
  )
  const profiles = new Map<string, string>()
  if (actorIds.length > 0) {
    const { data: pData } = await sb
      .from("profiles")
      .select("id, full_name, email")
      .in("id", actorIds)
    for (const p of (pData ?? []) as Array<{
      id: string
      full_name: string | null
      email: string
    }>) {
      profiles.set(p.id, p.full_name ?? p.email)
    }
  }
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    link: r.link,
    entityType: r.entity_type,
    entityId: r.entity_id,
    readAt: r.read_at,
    createdAt: r.created_at,
    actor: {
      id: r.actor_id,
      name: r.actor_id ? (profiles.get(r.actor_id) ?? "Unknown") : "System",
    },
  }))
}

export async function countUnread(workspaceSlug: string): Promise<number> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()
    const { count } = await sb
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("tenant_id", user.workspaceId)
      .is("read_at", null)
    return count ?? 0
  } catch {
    return 0
  }
}
