import "server-only"
import { headers } from "next/headers"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Per-IP throttle for public auth routes.
 *
 * Each call records an attempt and counts the recent window. If the count
 * exceeds the limit, returns ok:false. The caller (a server action) maps
 * that to a friendly error response — no need to surface the exact reason
 * to attackers.
 *
 * The IP is read from the X-Forwarded-For header (Vercel sets this);
 * falls back to "unknown" so a misconfigured edge doesn't accidentally
 * make every request share a bucket.
 */

export type AuthEndpoint =
  | "signup"
  | "login"
  | "magic-link"
  | "accept-invite"

const LIMITS: Record<AuthEndpoint, { perWindow: number; windowSec: number }> = {
  // Tight enough to slow brute-force; loose enough that a real user with
  // a typo doesn't get locked out.
  login: { perWindow: 8, windowSec: 60 * 5 }, // 8 / 5 min
  signup: { perWindow: 5, windowSec: 60 * 60 }, // 5 / hour
  "magic-link": { perWindow: 5, windowSec: 60 * 5 }, // 5 / 5 min
  "accept-invite": { perWindow: 10, windowSec: 60 * 5 }, // 10 / 5 min
}

async function readClientIp(): Promise<string> {
  try {
    const h = await headers()
    const fwd = h.get("x-forwarded-for")
    if (fwd) return fwd.split(",")[0].trim()
    const real = h.get("x-real-ip")
    if (real) return real
  } catch {
    /* headers() unavailable (route handler / SSR edge) */
  }
  return "unknown"
}

export type RateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfterSec: number; message: string }

export async function checkAuthRateLimit(
  endpoint: AuthEndpoint,
): Promise<RateLimitDecision> {
  const ip = await readClientIp()
  const cfg = LIMITS[endpoint]
  const sb = supabaseAdmin()
  const since = new Date(Date.now() - cfg.windowSec * 1000).toISOString()

  // Insert first then count — the same insert-then-count pattern the AI
  // limiter uses, which closes the race between concurrent attempts.
  await sb.from("auth_rate_limits").insert({ ip, endpoint })

  const { count } = await sb
    .from("auth_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("endpoint", endpoint)
    .gte("created_at", since)

  const used = count ?? 0
  if (used > cfg.perWindow) {
    return {
      ok: false,
      retryAfterSec: cfg.windowSec,
      message: "Too many attempts. Try again in a few minutes.",
    }
  }
  return { ok: true }
}
