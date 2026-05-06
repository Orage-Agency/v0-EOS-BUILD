// ═══════════════════════════════════════════════════════════
// lib/auth/jwt.ts — Verified JWT decode for Supabase access tokens
//
// The codebase used to read `sub` out of the access-token cookie without
// verifying the JWT signature, because @supabase/ssr 0.10.2 + ES256 keys
// returned null from auth.getUser() in both Edge and Node runtimes.
// That admit-without-verify shortcut means a forged cookie with any
// `sub` would pass admission (proxy.ts then service-roles its way to a
// profile by id alone).
//
// This module verifies the signature against the project JWKS (ES256)
// or a shared HS256 secret, with an in-process JWKS cache so steady-state
// admission is just an HMAC/ECDSA check, no network. Falls back to an
// unverified decode ONLY when the project explicitly opts out via
// AUTH_JWT_VERIFY=off (escape hatch for local dev without internet).
// ═══════════════════════════════════════════════════════════

import { createRemoteJWKSet, jwtVerify, decodeJwt as decodeJwtUnsafe } from "jose"

type Claims = {
  sub: string
  exp?: number
  iat?: number
  email?: string
  role?: string
  aud?: string | string[]
}

let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null
let hsKeyCache: Uint8Array | null = null

function projectUrl(): string | null {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    null
  )
}

function getJwks() {
  if (jwksCache) return jwksCache
  const url = projectUrl()
  if (!url) return null
  // Supabase publishes ES256 JWKS at /auth/v1/.well-known/jwks.json
  const jwksUrl = new URL("/auth/v1/.well-known/jwks.json", url)
  jwksCache = createRemoteJWKSet(jwksUrl, {
    // Cache the key set for 10 minutes; jose handles refresh on miss.
    cooldownDuration: 30_000,
    cacheMaxAge: 600_000,
  })
  return jwksCache
}

function getHsKey(): Uint8Array | null {
  if (hsKeyCache) return hsKeyCache
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return null
  hsKeyCache = new TextEncoder().encode(secret)
  return hsKeyCache
}

/**
 * Verify a Supabase access token signature and return its claims.
 * Returns null on any failure (bad signature, expired, malformed).
 *
 * Tries asymmetric (ES256/RS256 via JWKS) first, then symmetric (HS256
 * via SUPABASE_JWT_SECRET). One of these will always work for a given
 * project. Both are tried because we don't always know upfront which key
 * scheme the project is on, and we don't want to lock the codebase to
 * one when we know teams sometimes flip projects.
 */
export async function verifyAccessToken(token: string): Promise<Claims | null> {
  if (!token) return null

  // Escape hatch — only honored OUTSIDE production. Lets local dev work
  // without internet access to JWKS. Never trust this in prod.
  if (
    process.env.AUTH_JWT_VERIFY === "off" &&
    process.env.NODE_ENV !== "production"
  ) {
    try {
      const claims = decodeJwtUnsafe(token) as Claims
      if (!claims.sub) return null
      if (claims.exp && claims.exp <= Math.floor(Date.now() / 1000)) return null
      return claims
    } catch {
      return null
    }
  }

  const jwks = getJwks()
  if (jwks) {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        // Supabase tokens have aud "authenticated" for normal users.
        // We don't pin aud here because service tokens use "service_role"
        // and we want the same verifier to handle both.
      })
      const claims = payload as unknown as Claims
      if (!claims.sub) return null
      return claims
    } catch {
      // Fall through to HS256 attempt — older Supabase projects use HS256.
    }
  }

  const hs = getHsKey()
  if (hs) {
    try {
      const { payload } = await jwtVerify(token, hs)
      const claims = payload as unknown as Claims
      if (!claims.sub) return null
      return claims
    } catch {
      return null
    }
  }

  return null
}

/**
 * Edge-runtime-safe wrapper. `jose` works in both runtimes; this is just
 * a clarity alias for callers who want to be explicit.
 */
export const verifyAccessTokenEdge = verifyAccessToken
