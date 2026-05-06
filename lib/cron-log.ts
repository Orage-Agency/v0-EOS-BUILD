import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Best-effort heartbeat record for every cron tick. Each /api/cron/*
 * route wraps its work in withCronLog and gets:
 *   • A row in cron_runs with job + ok + duration_ms + details
 *   • Console + Sentry capture on the unhappy path
 *
 * Never throws — we'd rather lose a heartbeat than fail the cron run.
 */

export type CronJobName =
  | "daily-digest"
  | "overdue-sweep"
  | "drift-sweep"
  | "webhook-delivery"
  | "webhook-deliveries-cleanup"
  | "idempotency-cleanup"

export async function recordCronRun(args: {
  job: CronJobName
  ok: boolean
  durationMs: number
  details?: Record<string, unknown>
}): Promise<void> {
  try {
    const sb = supabaseAdmin()
    await sb.from("cron_runs").insert({
      job: args.job,
      ok: args.ok,
      duration_ms: args.durationMs,
      details: args.details ?? null,
    })
  } catch {
    /* logging is best-effort — never break a cron because the log write hiccupped */
  }
}

/**
 * Convenience wrapper: time a cron handler, record the result.
 *
 *     return withCronLog("drift-sweep", async () => {
 *       const counters = await runDriftSweep()
 *       return { ok: true, details: counters }
 *     })
 */
export async function withCronLog<T extends { ok: boolean; details?: Record<string, unknown> }>(
  job: CronJobName,
  handler: () => Promise<T>,
): Promise<T> {
  const t0 = Date.now()
  try {
    const result = await handler()
    await recordCronRun({
      job,
      ok: result.ok,
      durationMs: Date.now() - t0,
      details: result.details,
    })
    return result
  } catch (err) {
    await recordCronRun({
      job,
      ok: false,
      durationMs: Date.now() - t0,
      details: { error: err instanceof Error ? err.message : "Unknown" },
    })
    throw err
  }
}
