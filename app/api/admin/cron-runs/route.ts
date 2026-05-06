/**
 * Master-only — returns the last 100 cron runs and a per-job summary
 * (last_run, last_ok, success rate, p95 latency over the trailing
 * window). Used by the master admin dashboard for "did the daily
 * cron actually fire?".
 *
 * Auth: master profile only. Regular workspace owners don't see this
 * — it's cross-workspace heartbeat data.
 */
import { NextResponse } from "next/server"
import { getAuthUserIdFromCookie } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Run = {
  id: number
  job: string
  ok: boolean
  duration_ms: number
  details: Record<string, unknown> | null
  ran_at: string
}

export async function GET() {
  const userId = await getAuthUserIdFromCookie()
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }
  const sb = supabaseAdmin()
  const { data: profile } = await sb
    .from("profiles")
    .select("is_master")
    .eq("id", userId)
    .maybeSingle()
  if (!profile?.is_master) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 })
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await sb
    .from("cron_runs")
    .select("id, job, ok, duration_ms, details, ran_at")
    .gte("ran_at", since)
    .order("ran_at", { ascending: false })
    .limit(500)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const runs = (data ?? []) as Run[]

  // Per-job summary: last run + 7-day success rate + p95 duration.
  const byJob = new Map<
    string,
    {
      job: string
      runs: number
      successes: number
      lastRun: Run | null
      durations: number[]
    }
  >()
  for (const r of runs) {
    const cur = byJob.get(r.job) ?? {
      job: r.job,
      runs: 0,
      successes: 0,
      lastRun: null,
      durations: [],
    }
    cur.runs += 1
    if (r.ok) cur.successes += 1
    if (!cur.lastRun || r.ran_at > cur.lastRun.ran_at) {
      cur.lastRun = r
    }
    cur.durations.push(r.duration_ms)
    byJob.set(r.job, cur)
  }

  const summary = Array.from(byJob.values())
    .map((s) => {
      const sorted = s.durations.slice().sort((a, b) => a - b)
      const p95 =
        sorted.length === 0
          ? 0
          : sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
      return {
        job: s.job,
        runs: s.runs,
        successes: s.successes,
        success_rate: s.runs > 0 ? s.successes / s.runs : 0,
        last_run: s.lastRun
          ? {
              ran_at: s.lastRun.ran_at,
              ok: s.lastRun.ok,
              duration_ms: s.lastRun.duration_ms,
              details: s.lastRun.details,
            }
          : null,
        p95_ms: p95,
      }
    })
    .sort((a, b) => a.job.localeCompare(b.job))

  return NextResponse.json({
    summary,
    recent: runs.slice(0, 100),
    window_days: 7,
  })
}
