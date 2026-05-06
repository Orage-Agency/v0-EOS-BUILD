import { afterEach, beforeEach, describe, expect, it } from "vitest"
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
  let originalSecret: string | undefined
  let originalNodeEnv: string | undefined
  let originalUrl: string | undefined

  beforeEach(() => {
    originalSecret = process.env.SUPABASE_JWT_SECRET
    originalNodeEnv = process.env.NODE_ENV
    originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.SUPABASE_JWT_SECRET = HS_SECRET
    // Drop the URL so the JWKS path short-circuits — we want the test to
    // exercise HS256 fallback deterministically.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_URL
  })

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SUPABASE_JWT_SECRET
    else process.env.SUPABASE_JWT_SECRET = originalSecret
    if (originalNodeEnv) process.env.NODE_ENV = originalNodeEnv
    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
  })

  it("verifies a valid HS256 token and returns the claims", async () => {
    // Re-import so the module reads the test env vars instead of the
    // ones it captured at first import. Vite-vitest hoists modules
    // before env mutation otherwise.
    const mod = await import("@/lib/auth/jwt?fresh-1")
    const token = await makeHsToken({ sub: "user-uuid-1" })
    const claims = await mod.verifyAccessToken(token)
    expect(claims).not.toBeNull()
    expect(claims!.sub).toBe("user-uuid-1")
  })

  it("rejects a token signed with the wrong secret", async () => {
    const mod = await import("@/lib/auth/jwt?fresh-2")
    const wrongKey = new TextEncoder().encode("a-completely-different-secret-32b!")
    const iat = Math.floor(Date.now() / 1000)
    const forged = await new SignJWT({ sub: "attacker-uuid" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(iat)
      .setExpirationTime(iat + 3600)
      .sign(wrongKey)
    const claims = await mod.verifyAccessToken(forged)
    expect(claims).toBeNull()
  })

  it("rejects a malformed token", async () => {
    const mod = await import("@/lib/auth/jwt?fresh-3")
    const claims = await mod.verifyAccessToken("not.a.valid.jwt")
    expect(claims).toBeNull()
  })

  it("rejects an empty token without exploding", async () => {
    const mod = await import("@/lib/auth/jwt?fresh-4")
    const claims = await mod.verifyAccessToken("")
    expect(claims).toBeNull()
  })

  it("returns null when no secret is configured anywhere", async () => {
    delete process.env.SUPABASE_JWT_SECRET
    const mod = await import("@/lib/auth/jwt?fresh-5")
    const token = await makeHsToken({ sub: "u" })
    const claims = await mod.verifyAccessToken(token)
    // Without a key + JWKS URL the verifier has nothing to compare
    // against — fail closed, never admit by default.
    expect(claims).toBeNull()
  })
})
