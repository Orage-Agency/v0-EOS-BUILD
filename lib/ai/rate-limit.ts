import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"

// Per-user defaults. Override via env to bump for power users.
const DEFAULTS = {
  perHour: Number(process.env.AI_RATE_LIMIT_PER_HOUR ?? 60),
  perDay: Number(process.env.AI_RATE_LIMIT_PER_DAY ?? 400),
}

export type RateLimitDecision =
  | { ok: true; remainingHour: number; remainingDay: number }
  | {
      ok: false
      reason: "hour" | "day"
      retryAfterSec: number
      message: string
    }

/**
 * Decide whether `userId` may make another AI request right now.
 * On allow, also writes a row to ai_request_log so the next call counts it.
 */
export async function checkAndRecordAIRequest(args: {
  tenantId: string
  userId: string
  endpoint: string
}): Promise<RateLimitDecision> {
  const sb = supabaseAdmin()
  const now = Date.now()
  const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()

  // Two count queries are cheaper than fetching rows; the index on
  // (user_id, created_at DESC) makes both fast even with thousands of rows.
  const [{ count: hourCount }, { count: dayCount }] = await Promise.all([
    sb
      .from("ai_request_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", args.userId)
      .gte("created_at", oneHourAgo),
    sb
      .from("ai_request_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", args.userId)
      .gte("created_at", oneDayAgo),
  ])

  const usedHour = hourCount ?? 0
  const usedDay = dayCount ?? 0

  if (usedHour >= DEFAULTS.perHour) {
    return {
      ok: false,
      reason: "hour",
      retryAfterSec: 60 * 60,
      message: `AI rate limit hit: ${DEFAULTS.perHour} requests/hour. Try again later.`,
    }
  }
  if (usedDay >= DEFAULTS.perDay) {
    return {
      ok: false,
      reason: "day",
      retryAfterSec: 24 * 60 * 60,
      message: `AI rate limit hit: ${DEFAULTS.perDay} requests/day. Resets in 24h.`,
    }
  }

  // Record this request before letting it through. Failure here doesn't
  // block — we'd rather serve the user than 500 on a flaky log write.
  await sb.from("ai_request_log").insert({
    tenant_id: args.tenantId,
    user_id: args.userId,
    endpoint: args.endpoint,
  })

  return {
    ok: true,
    remainingHour: DEFAULTS.perHour - usedHour - 1,
    remainingDay: DEFAULTS.perDay - usedDay - 1,
  }
}
