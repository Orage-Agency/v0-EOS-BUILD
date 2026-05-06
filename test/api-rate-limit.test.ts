import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Tests checkAndRecordApiRequest's branching against a mocked
 * supabaseAdmin. Doesn't need a real DB — we only care that:
 *   • Healthy responses pass through with `ok: true`
 *   • Minute-bucket overflow flips to `ok: false` with retryAfter=60
 *   • Hour-window overflow flips to `ok: false` with retryAfter=3600
 *   • A failed RPC fails OPEN — never lock real users out on a glitch
 */

type RpcResp = {
  data: unknown
  error: { message: string } | null
}

let nextRpcResponse: RpcResp = { data: null, error: null }

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    rpc: vi.fn(async () => nextRpcResponse),
  }),
}))

beforeEach(() => {
  nextRpcResponse = { data: null, error: null }
  vi.resetModules()
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe("checkAndRecordApiRequest", () => {
  it("returns ok when minute + hour are well below the limit", async () => {
    nextRpcResponse = {
      data: [{ minute_count: 5, hour_count: 12 }],
      error: null,
    }
    const { checkAndRecordApiRequest } = await import("@/lib/api-rate-limit")
    const r = await checkAndRecordApiRequest("key-1")
    expect(r.ok).toBe(true)
    if (r.ok) {
      // Default limits: 60/min, 1000/hr. 60-5=55, 1000-12=988.
      expect(r.remainingMinute).toBe(55)
      expect(r.remainingHour).toBe(988)
    }
  })

  it("rejects with 60s retry when the minute bucket overflows", async () => {
    nextRpcResponse = {
      data: [{ minute_count: 61, hour_count: 100 }],
      error: null,
    }
    const { checkAndRecordApiRequest } = await import("@/lib/api-rate-limit")
    const r = await checkAndRecordApiRequest("key-2")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.retryAfterSec).toBe(60)
      expect(r.message.toLowerCase()).toContain("rate limit")
    }
  })

  it("rejects with 3600s retry when the hour bucket overflows", async () => {
    nextRpcResponse = {
      data: [{ minute_count: 10, hour_count: 1001 }],
      error: null,
    }
    const { checkAndRecordApiRequest } = await import("@/lib/api-rate-limit")
    const r = await checkAndRecordApiRequest("key-3")
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.retryAfterSec).toBe(3600)
    }
  })

  it("fails open when the RPC errors — never lock users out on a glitch", async () => {
    nextRpcResponse = {
      data: null,
      error: { message: "connection lost" },
    }
    const { checkAndRecordApiRequest } = await import("@/lib/api-rate-limit")
    const r = await checkAndRecordApiRequest("key-4")
    expect(r.ok).toBe(true)
  })

  it("emits the canonical X-RateLimit-* headers", async () => {
    const { rateLimitHeaders } = await import("@/lib/api-rate-limit")
    const result = {
      ok: true as const,
      remainingMinute: 50,
      remainingHour: 950,
    }
    const headers = new Headers(rateLimitHeaders(result))
    expect(headers.get("X-RateLimit-Limit-Minute")).toBe("60")
    expect(headers.get("X-RateLimit-Limit-Hour")).toBe("1000")
    expect(headers.get("X-RateLimit-Remaining-Minute")).toBe("50")
    expect(headers.get("X-RateLimit-Remaining-Hour")).toBe("950")
  })
})
