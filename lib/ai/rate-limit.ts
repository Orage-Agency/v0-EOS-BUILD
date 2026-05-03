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
 *
 * Insert-then-count: the previous check-then-insert ordering let parallel
 * requests both pass the limit before either recorded, so a user could
 * burst past their quota with concurrent calls. We now insert first, then
 * count rows in the window. If the post-insert count exceeds the cap, we
 * delete the row we just wrote and reject the request. This is the
 * tightest non-transactional guard available without a stored procedure.
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

  const { data: inserted, error: insertErr } = await sb
    .from("ai_request_log")
    .insert({
      tenant_id: args.tenantId,
      user_id: args.userId,
      endpoint: args.endpoint,
    })
    .select("id")
    .single()

  // Failure to log is fail-open — better to serve the user than 500 on a
  // flaky log write. Returns ok with conservative remaining counts.
  if (insertErr || !inserted) {
    return {
      ok: true,
      remainingHour: DEFAULTS.perHour,
      remainingDay: DEFAULTS.perDay,
    }
  }

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

  if (usedHour > DEFAULTS.perHour) {
    await sb.from("ai_request_log").delete().eq("id", (inserted as { id: string }).id)
    return {
      ok: false,
      reason: "hour",
      retryAfterSec: 60 * 60,
      message: `AI rate limit hit: ${DEFAULTS.perHour} requests/hour. Try again later.`,
    }
  }
  if (usedDay > DEFAULTS.perDay) {
    await sb.from("ai_request_log").delete().eq("id", (inserted as { id: string }).id)
    return {
      ok: false,
      reason: "day",
      retryAfterSec: 24 * 60 * 60,
      message: `AI rate limit hit: ${DEFAULTS.perDay} requests/day. Resets in 24h.`,
    }
  }

  return {
    ok: true,
    remainingHour: Math.max(0, DEFAULTS.perHour - usedHour),
    remainingDay: Math.max(0, DEFAULTS.perDay - usedDay),
  }
}
