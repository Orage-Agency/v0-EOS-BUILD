import "server-only"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Postgres-backed leaky bucket for the public REST API.
 *
 * Why Postgres and not Redis: this codebase is on Hobby + Supabase free
 * tier — adding Upstash would push us over budget for a feature that
 * caps abuse at <10 req/sec across a single workspace's keys. The DB
 * round-trip adds ~10ms; acceptable until we cross 100 req/sec.
 *
 * Limits (per API key):
 *   • 60 requests per minute
 *   • 1000 requests per hour
 *
 * The `increment_api_rate_limit` SQL helper does the upsert + sum in a
 * single statement so we avoid a read/write race when two requests race
 * to bump the same minute bucket.
 */

const MINUTE_LIMIT = Number(process.env.API_RATE_LIMIT_PER_MINUTE ?? 60)
const HOUR_LIMIT = Number(process.env.API_RATE_LIMIT_PER_HOUR ?? 1000)

export type ApiRateLimitResult =
  | { ok: true; remainingMinute: number; remainingHour: number }
  | {
      ok: false
      remainingMinute: number
      remainingHour: number
      retryAfterSec: number
      message: string
    }

export async function checkAndRecordApiRequest(
  apiKeyId: string,
): Promise<ApiRateLimitResult> {
  const sb = supabaseAdmin()
  const { data, error } = await sb.rpc("increment_api_rate_limit", {
    p_api_key_id: apiKeyId,
  })
  if (error) {
    // Fail open — never lock real traffic out because Postgres flickered.
    // The next request will retry; logged so we'd notice in Sentry if it
    // turns into a pattern.
    console.error("[api-rate-limit] increment failed", error.message)
    return { ok: true, remainingMinute: MINUTE_LIMIT, remainingHour: HOUR_LIMIT }
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { hour_count: number; minute_count: number }
    | undefined
  const minute = row?.minute_count ?? 0
  const hour = row?.hour_count ?? 0
  const remainingMinute = Math.max(0, MINUTE_LIMIT - minute)
  const remainingHour = Math.max(0, HOUR_LIMIT - hour)
  if (minute > MINUTE_LIMIT) {
    return {
      ok: false,
      remainingMinute: 0,
      remainingHour,
      retryAfterSec: 60,
      message: `Rate limit exceeded — ${MINUTE_LIMIT} req/minute. Slow down.`,
    }
  }
  if (hour > HOUR_LIMIT) {
    return {
      ok: false,
      remainingMinute,
      remainingHour: 0,
      retryAfterSec: 3600,
      message: `Rate limit exceeded — ${HOUR_LIMIT} req/hour.`,
    }
  }
  return { ok: true, remainingMinute, remainingHour }
}

export function rateLimitHeaders(result: ApiRateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit-Minute": String(MINUTE_LIMIT),
    "X-RateLimit-Limit-Hour": String(HOUR_LIMIT),
    "X-RateLimit-Remaining-Minute": String(result.remainingMinute),
    "X-RateLimit-Remaining-Hour": String(result.remainingHour),
  }
}
