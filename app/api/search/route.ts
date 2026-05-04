/**
 * Workspace-wide search endpoint backing the Cmd+K palette.
 * Returns up to 8 matches across rocks / tasks / issues / notes, scoped
 * to the caller's current workspace and gated by requireUser.
 */
import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export type SearchHit = {
  id: string
  kind: "rock" | "task" | "issue" | "note"
  title: string
  subtitle: string
  href: string
}

function escLike(s: string) {
  // PostgREST ilike pattern — escape % and _ that the user typed so they
  // don't get interpreted as wildcards.
  return s.replace(/[\\%_]/g, "\\$&")
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get("slug") ?? ""
  const q = (url.searchParams.get("q") ?? "").trim()
  if (!slug || q.length < 2) {
    return NextResponse.json({ hits: [] satisfies SearchHit[] })
  }
  try {
    const me = await requireUser(slug)
    const sb = supabaseAdmin()
    const pattern = `%${escLike(q)}%`
    const tenantId = me.workspaceId

    const [rocks, tasks, issues, notes] = await Promise.all([
      sb
        .from("rocks")
        .select("id, title, status, quarter")
        .eq("tenant_id", tenantId)
        .ilike("title", pattern)
        .limit(3),
      sb
        .from("tasks")
        .select("id, title, status, due_date")
        .eq("tenant_id", tenantId)
        .ilike("title", pattern)
        .limit(3),
      sb
        .from("issues")
        .select("id, title, severity, stage")
        .eq("tenant_id", tenantId)
        .ilike("title", pattern)
        .limit(2),
      sb
        .from("notes")
        .select("id, title, updated_at")
        .eq("tenant_id", tenantId)
        .ilike("title", pattern)
        .limit(2),
    ])

    const hits: SearchHit[] = []
    for (const r of (rocks.data ?? []) as Array<{
      id: string
      title: string
      status: string
      quarter: string
    }>) {
      hits.push({
        id: r.id,
        kind: "rock",
        title: r.title,
        subtitle: `Rock · ${r.quarter} · ${r.status.replace(/_/g, " ")}`,
        href: `/${slug}/rocks?focus=${r.id}`,
      })
    }
    for (const t of (tasks.data ?? []) as Array<{
      id: string
      title: string
      status: string
      due_date: string | null
    }>) {
      hits.push({
        id: t.id,
        kind: "task",
        title: t.title,
        subtitle: `Task · ${t.status}${t.due_date ? ` · due ${t.due_date.slice(0, 10)}` : ""}`,
        href: `/${slug}/tasks?focus=${t.id}`,
      })
    }
    for (const i of (issues.data ?? []) as Array<{
      id: string
      title: string
      severity: string
      stage: string
    }>) {
      hits.push({
        id: i.id,
        kind: "issue",
        title: i.title,
        subtitle: `Issue · ${i.severity} · ${i.stage}`,
        href: `/${slug}/issues?focus=${i.id}`,
      })
    }
    for (const n of (notes.data ?? []) as Array<{
      id: string
      title: string
    }>) {
      hits.push({
        id: n.id,
        kind: "note",
        title: n.title || "Untitled note",
        subtitle: "Note",
        href: `/${slug}/notes?focus=${n.id}`,
      })
    }
    return NextResponse.json({ hits: hits.slice(0, 8) })
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err
    return NextResponse.json({ hits: [] satisfies SearchHit[] }, { status: 200 })
  }
}
