import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SignJWT } from "jose"

/**
 * Sanity tests for lib/auth/jwt.ts. We don't have JWKS in unit-test
 * scope, but the HS256 path is exercisable with a hand-rolled secret
 * — and that path is what runs on older Supabase projects + the
 * fallback path on every project. Together with the AUTH_JWT_VERIFY=off
 * escape hatch this gives us coverage of every branch except the JWKS
 * round-trip.
 */

const HS_SECRET = "test-secret-for-unit-tests-32bytes!!!"

async function makeHsToken(payload: Record<string, unknown>): Promise<string> {
  const key = new TextEncoder().encode(HS_SECRET)
  const iat = Math.floor(Date.now() / 1000)
  const jwt = new SignJWT({ ...payload }).setProtectedHeader({ alg: "HS256" }).setIssuedAt(iat)
  if (typeof payload.exp === "number") jwt.setExpirationTime(payload.exp)
  else jwt.setExpirationTime(iat + 3600)
  return await jwt.sign(key)
}

describe("verifyAccessToken (HS256)", () => {
  const env = process.env as Record<string, string | undefined>
  let originalSecret: string | undefined
  let originalUrl: string | undefined
  let originalSupabaseUrl: string | undefined

  beforeEach(() => {
    originalSecret = env.SUPABASE_JWT_SECRET
    originalUrl = env.NEXT_PUBLIC_SUPABASE_URL
    originalSupabaseUrl = env.SUPABASE_URL
    env.SUPABASE_JWT_SECRET = HS_SECRET
    // Drop the URL so the JWKS path short-circuits — we want the test to
    // exercise HS256 fallback deterministically.
    delete env.NEXT_PUBLIC_SUPABASE_URL
    delete env.SUPABASE_URL
    // Reset the module so the verifier's lazy-init JWKS + HS key caches
    // don't carry over from a previous test run.
    vi.resetModules()
  })

  afterEach(() => {
    if (originalSecret === undefined) delete env.SUPABASE_JWT_SECRET
    else env.SUPABASE_JWT_SECRET = originalSecret
    if (originalUrl) env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    if (originalSupabaseUrl) env.SUPABASE_URL = originalSupabaseUrl
  })

  it("verifies a valid HS256 token and returns the claims", async () => {
    const { verifyAccessToken } = await import("@/lib/auth/jwt")
    const token = await makeHsToken({ sub: "user-uuid-1" })
    const claims = await verifyAccessToken(token)
    expect(claims).not.toBeNull()
    expect(claims!.sub).toBe("user-uuid-1")
  })

  it("rejects a token signed with the wrong secret", async () => {
    const { verifyAccessToken } = await import("@/lib/auth/jwt")
    const wrongKey = new TextEncoder().encode("a-completely-different-secret-32b!")
    const iat = Math.floor(Date.now() / 1000)
    const forged = await new SignJWT({ sub: "attacker-uuid" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(iat)
      .setExpirationTime(iat + 3600)
      .sign(wrongKey)
    const claims = await verifyAccessToken(forged)
    expect(claims).toBeNull()
  })

  it("rejects a malformed token", async () => {
    const { verifyAccessToken } = await import("@/lib/auth/jwt")
    const claims = await verifyAccessToken("not.a.valid.jwt")
    expect(claims).toBeNull()
  })

  it("rejects an empty token without exploding", async () => {
    const { verifyAccessToken } = await import("@/lib/auth/jwt")
    const claims = await verifyAccessToken("")
    expect(claims).toBeNull()
  })

  it("returns null when no secret is configured anywhere", async () => {
    delete env.SUPABASE_JWT_SECRET
    vi.resetModules()
    const { verifyAccessToken } = await import("@/lib/auth/jwt")
    const token = await makeHsToken({ sub: "u" })
    const claims = await verifyAccessToken(token)
    // Without a key + JWKS URL the verifier has nothing to compare
    // against — fail closed, never admit by default.
    expect(claims).toBeNull()
  })
})
