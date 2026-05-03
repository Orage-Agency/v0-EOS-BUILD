/**
 * Overdue sweep — once a day, look for tasks that are past their due_date
 * and not done, then create a one-shot "overdue" notification for the
 * owner. Idempotent: we only create a notification if one hasn't already
 * been generated for the same task in the last 24 hours.
 */
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    // Production must fail closed — see daily-digest route for context.
    if (process.env.NODE_ENV === "production") return false
    return true
  }
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${secret}`
}

type Task = {
  id: string
  tenant_id: string
  title: string
  owner_id: string | null
  due_date: string | null
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const sb = supabaseAdmin()
  const todayIso = new Date().toISOString()
  const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: tasks, error } = await sb
    .from("tasks")
    .select("id, tenant_id, title, owner_id, due_date")
    .lt("due_date", todayIso)
    .neq("status", "done")
    .neq("status", "cancelled")
    .not("owner_id", "is", null)
    .limit(2000)

  if (error) {
    console.error("[cron/overdue-sweep] read failed", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const rows = (tasks ?? []) as Task[]
  if (rows.length === 0) return NextResponse.json({ ok: true, created: 0 })

  // Pull every "overdue" notification created in the last 24 hours so we
  // can skip tasks we already pinged about.
  const taskIds = rows.map((t) => t.id)
  const { data: existing } = await sb
    .from("notifications")
    .select("entity_id")
    .eq("kind", "overdue")
    .in("entity_id", taskIds)
    .gte("created_at", yesterdayIso)
  const recentlyNotified = new Set(
    ((existing ?? []) as Array<{ entity_id: string }>).map((r) => r.entity_id),
  )

  let created = 0
  for (const t of rows) {
    if (!t.owner_id) continue
    if (recentlyNotified.has(t.id)) continue
    const { error: insErr } = await sb.from("notifications").insert({
      tenant_id: t.tenant_id,
      recipient_id: t.owner_id,
      actor_id: null,
      kind: "overdue",
      entity_type: "task",
      entity_id: t.id,
      title: "Task is overdue",
      body: t.title,
      link: null,
    })
    if (!insErr) created++
  }

  return NextResponse.json({ ok: true, scanned: rows.length, created })
}
