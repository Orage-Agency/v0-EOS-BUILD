/**
 * Public health probe — used by uptime monitors (Better Stack, Pingdom,
 * the /status page itself) to verify the app + dependencies are awake.
 *
 * Checks (each with a hard 3s timeout):
 *   • Web tier — implicit, by virtue of returning a response.
 *   • Postgres / Supabase — count(1) on a known-tiny table.
 *   • AI Gateway — HEAD against the gateway base URL (cheap).
 *
 * Response shape:
 *   { ok: true|false, checks: { db, ai }, version, generated_at }
 *
 * Returns HTTP 200 even when a downstream check fails, but flips
 * `ok=false` so the consumer sees the degraded state. Returning 503
 * would mask a webhook attempt the user can't see.
 */
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 10

type CheckResult = {
  ok: boolean
  latency_ms: number
  error?: string
}

async function withTimeout<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  return await Promise.race([
    fn(),
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ])
}

async function checkDb(): Promise<CheckResult> {
  const t0 = Date.now()
  try {
    await withTimeout(3000, async () => {
      const sb = supabaseAdmin()
      const { error } = await sb
        .from("workspaces")
        .select("id", { head: true, count: "exact" })
        .limit(1)
      if (error) throw new Error(error.message)
    })
    return { ok: true, latency_ms: Date.now() - t0 }
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - t0,
      error: err instanceof Error ? err.message : "unknown",
    }
  }
}

async function checkAi(): Promise<CheckResult> {
  const t0 = Date.now()
  try {
    await withTimeout(3000, async () => {
      // The Vercel AI Gateway responds to HEAD on its base URL when an
      // API key is set. We don't validate the body — a 200/401 is enough
      // to confirm DNS + TLS + routing.
      const res = await fetch("https://gateway.ai.vercel.com/v1", {
        method: "HEAD",
        headers: process.env.AI_GATEWAY_API_KEY
          ? { Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}` }
          : undefined,
        signal: AbortSignal.timeout(2500),
      })
      // Any sub-500 response is a healthy upstream.
      if (res.status >= 500) {
        throw new Error(`upstream HTTP ${res.status}`)
      }
    })
    return { ok: true, latency_ms: Date.now() - t0 }
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - t0,
      error: err instanceof Error ? err.message : "unknown",
    }
  }
}

export async function GET() {
  const [db, ai] = await Promise.all([checkDb(), checkAi()])
  const ok = db.ok && ai.ok
  return NextResponse.json(
    {
      ok,
      checks: { db, ai },
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
      region: process.env.VERCEL_REGION ?? "local",
      generated_at: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  )
}

export async function HEAD() {
  // Lightweight uptime ping — same checks, no body. Useful for tools
  // (Better Stack) that just want a 200/non-200.
  const [db, ai] = await Promise.all([checkDb(), checkAi()])
  const ok = db.ok && ai.ok
  return new Response(null, {
    status: ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  })
}
