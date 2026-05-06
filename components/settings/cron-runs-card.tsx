"use client"

import { useEffect, useState } from "react"
import { SCard } from "./ui"
import { cn } from "@/lib/utils"

/**
 * Master-only widget that surfaces real cron heartbeat data from
 * /api/admin/cron-runs (which is protected at the route level — this
 * component just renders whatever it returns). Closes the 'did the
 * daily cron actually fire?' question without spelunking through
 * Vercel function logs.
 */

type Summary = {
  job: string
  runs: number
  successes: number
  success_rate: number
  last_run: {
    ran_at: string
    ok: boolean
    duration_ms: number
    details: Record<string, unknown> | null
  } | null
  p95_ms: number
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 1000)}s`
}

export function CronRunsCard() {
  const [data, setData] = useState<{ summary: Summary[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/admin/cron-runs", { cache: "no-store" })
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const body = (await res.json()) as { summary: Summary[] }
        if (!cancelled) setData(body)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SCard
      title="CRON HEARTBEAT · 7-DAY"
      variant="master"
      action={
        <span className="text-[10px] text-text-muted font-mono">
          /api/admin/cron-runs
        </span>
      }
    >
      {loading ? (
        <p className="text-[11px] text-text-muted">Loading…</p>
      ) : error ? (
        <p className="text-[11px] text-danger">Couldn't load: {error}</p>
      ) : !data || data.summary.length === 0 ? (
        <p className="text-[11px] text-text-muted">
          No cron runs recorded yet. Heartbeats start landing on the next
          scheduled tick.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {data.summary.map((s) => {
            const last = s.last_run
            const rate = Math.round(s.success_rate * 100)
            return (
              <li
                key={s.job}
                className="flex items-center gap-3 px-3 py-2 rounded-sm bg-bg-3 border border-border-orage"
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    !last
                      ? "bg-text-muted"
                      : last.ok
                        ? "bg-success shadow-[0_0_5px_var(--success)]"
                        : "bg-danger shadow-[0_0_5px_var(--danger)]",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-text-primary font-mono truncate">
                    {s.job}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono mt-0.5">
                    {last
                      ? `last ${relTime(last.ran_at)} · ${fmtDuration(
                          last.duration_ms,
                        )}`
                      : "no runs in window"}{" "}
                    · {s.runs} run{s.runs === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <div
                    className={cn(
                      "font-display text-[11px] tracking-[0.06em]",
                      rate === 100
                        ? "text-success"
                        : rate >= 80
                          ? "text-gold-400"
                          : "text-danger",
                    )}
                  >
                    {rate}%
                  </div>
                  <div className="text-[9px] text-text-muted font-mono">
                    p95 {fmtDuration(s.p95_ms)}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SCard>
  )
}
