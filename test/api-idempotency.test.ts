import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Stripe-style idempotency contract tests.
 *
 * Mocks supabaseAdmin so we can stage:
 *   • No prior row → first-time decision (handler runs)
 *   • Row exists with same body_hash → replay decision
 *   • Row exists with different body_hash → conflict decision (422)
 *
 * Plus the ergonomic edges:
 *   • Missing Idempotency-Key header → no-key decision (handler runs
 *     unconditionally)
 *   • Header longer than 255 chars → conflict
 */

type ExistingRow =
  | null
  | {
      body_hash: string
      status_code: number
      response_body: unknown
    }

let nextSelectRow: ExistingRow = null

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: nextSelectRow })),
          })),
        })),
      })),
      insert: vi.fn(async () => ({ error: null })),
    })),
  }),
}))

beforeEach(() => {
  nextSelectRow = null
  vi.resetModules()
})

function makeReq(opts: {
  key?: string
  body?: string
}): Request {
  const headers: Record<string, string> = {}
  if (opts.key !== undefined) headers["idempotency-key"] = opts.key
  return new Request("https://example.com/api/v1/tasks", {
    method: "POST",
    headers,
    body: opts.body ?? "",
  })
}

describe("checkIdempotency", () => {
  it("returns no-key when the header is absent", async () => {
    const { checkIdempotency } = await import("@/lib/api-idempotency")
    const decision = await checkIdempotency(makeReq({}), "k", '{"x":1}')
    expect(decision.kind).toBe("no-key")
  })

  it("returns first-time when the key is fresh", async () => {
    nextSelectRow = null
    const { checkIdempotency } = await import("@/lib/api-idempotency")
    const decision = await checkIdempotency(
      makeReq({ key: "abc" }),
      "key-id",
      '{"x":1}',
    )
    expect(decision.kind).toBe("first-time")
  })

  it("replays the cached response when the key + body match", async () => {
    // Compute the same hash the implementation will: SHA-256 of the body.
    const { createHash } = await import("crypto")
    const bodyHash = createHash("sha256").update('{"x":1}').digest("hex")
    nextSelectRow = {
      body_hash: bodyHash,
      status_code: 201,
      response_body: { id: "saved-task-1" },
    }
    const { checkIdempotency } = await import("@/lib/api-idempotency")
    const decision = await checkIdempotency(
      makeReq({ key: "abc" }),
      "key-id",
      '{"x":1}',
    )
    expect(decision.kind).toBe("replay")
    if (decision.kind === "replay") {
      expect(decision.status).toBe(201)
      expect((decision.body as { id: string }).id).toBe("saved-task-1")
    }
  })

  it("returns conflict when the same key was used with a different body", async () => {
    const { createHash } = await import("crypto")
    const otherHash = createHash("sha256").update('{"x":2}').digest("hex")
    nextSelectRow = {
      body_hash: otherHash,
      status_code: 201,
      response_body: { id: "x" },
    }
    const { checkIdempotency } = await import("@/lib/api-idempotency")
    const decision = await checkIdempotency(
      makeReq({ key: "abc" }),
      "key-id",
      '{"x":1}',
    )
    expect(decision.kind).toBe("conflict")
    if (decision.kind === "conflict") {
      expect(decision.message.toLowerCase()).toContain("different request body")
    }
  })

  it("rejects keys longer than 255 chars", async () => {
    const longKey = "a".repeat(256)
    const { checkIdempotency } = await import("@/lib/api-idempotency")
    const decision = await checkIdempotency(
      makeReq({ key: longKey }),
      "key-id",
      "{}",
    )
    expect(decision.kind).toBe("conflict")
    if (decision.kind === "conflict") {
      expect(decision.message).toContain("too long")
    }
  })
})

describe("idempotencyReplayResponse", () => {
  it("ships the Idempotent-Replay header so callers can spot it", async () => {
    const { idempotencyReplayResponse } = await import("@/lib/api-idempotency")
    const res = idempotencyReplayResponse(201, { ok: true })
    expect(res.headers.get("Idempotent-Replay")).toBe("true")
    expect(res.status).toBe(201)
  })
})
