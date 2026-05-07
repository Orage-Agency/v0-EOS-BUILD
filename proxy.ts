// ═══════════════════════════════════════════════════════════
// proxy.ts — Supabase session refresh + workspace routing
// (Next 16 renamed `middleware` → `proxy`; same execution model.)
//
// We intentionally do NOT use @supabase/ssr's auth.getUser() in this
// middleware. In production v0.10.2 + ES256 JWTs, getUser() returned
// null even with a valid cookie — likely a JWKS fetch quirk under the
// Edge runtime. Instead we read the cookie ourselves and verify the JWT
// signature against the project JWKS via lib/auth/jwt.ts. The downstream
// layout/page still calls requireUser() which uses the same verifier.
// ═══════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import { verifyAccessToken } from "@/lib/auth/jwt"

const PUBLIC_PATHS = [
  "/login",
  "/login/mfa",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/auth",
  "/status",
]
const AUTH_PATHS = ["/login", "/signup"]

type SessionShape = {
  access_token: string
  refresh_token: string
  expires_at?: number
  user?: { id?: string }
}

function findAuthCookieNames(request: NextRequest): {
  base: string | null
  chunkNames: string[]
} {
  const all = request.cookies.getAll()
  const main = all.find((c) => /^sb-[^-]+-auth-token$/.test(c.name))
  const chunked = all
    .filter((c) => /^sb-[^-]+-auth-token\.\d+$/.test(c.name))
    .sort((a, b) => {
      const ai = Number(a.name.split(".").pop())
      const bi = Number(b.name.split(".").pop())
      return ai - bi
    })
  if (main) return { base: main.name, chunkNames: chunked.map((c) => c.name) }
  if (chunked.length) {
    const base = chunked[0].name.replace(/\.\d+$/, "")
    return { base, chunkNames: chunked.map((c) => c.name) }
  }
  return { base: null, chunkNames: [] }
}

function readSessionFromCookies(request: NextRequest): SessionShape | null {
  const all = request.cookies.getAll()
  const main = all.find((c) => /^sb-[^-]+-auth-token$/.test(c.name))
  const chunked = all
    .filter((c) => /^sb-[^-]+-auth-token\.\d+$/.test(c.name))
    .sort((a, b) => {
      const ai = Number(a.name.split(".").pop())
      const bi = Number(b.name.split(".").pop())
      return ai - bi
    })
  let raw = main?.value ?? chunked.map((c) => c.value).join("")
  if (!raw) return null
  if (raw.startsWith("base64-")) {
    try {
      raw = atob(raw.slice(7))
    } catch {
      return null
    }
  }
  try {
    const parsed = JSON.parse(raw) as SessionShape
    if (!parsed.access_token) return null
    return parsed
  } catch {
    return null
  }
}

// Manually exchange a refresh token for a fresh session. The
// @supabase/ssr cookie client can't do this in our project (ES256 quirk),
// so without this the user's session expires after the access token TTL
// (default 1h) and they get bounced to /login. Returns null on any
// failure; the caller can then treat the request as anonymous.
async function refreshSession(
  refreshToken: string,
): Promise<SessionShape | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !anon) return null
  try {
    const r = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!r.ok) return null
    const j = (await r.json()) as {
      access_token?: string
      refresh_token?: string
      expires_at?: number
      user?: { id?: string }
    }
    if (!j.access_token || !j.refresh_token) return null
    return {
      access_token: j.access_token,
      refresh_token: j.refresh_token,
      expires_at: j.expires_at,
      user: j.user,
    }
  } catch {
    return null
  }
}

// Write the refreshed session back into the same cookie name(s) that we
// read it from, mirroring the Supabase SDK's chunking format. Cookies
// over ~3500 chars are split into .0/.1 to stay under browser per-cookie
// size caps.
function writeSessionCookies(
  response: NextResponse,
  baseName: string,
  oldChunkNames: string[],
  session: SessionShape,
) {
  const value = "base64-" + btoa(JSON.stringify(session))
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // Match Supabase's default ~7-day cookie lifetime so the cookie itself
    // doesn't get evicted while the refresh token is still valid.
    maxAge: 60 * 60 * 24 * 7,
  }
  // Clear any stale chunks first so an old longer session doesn't leak
  // bytes into the next response.
  for (const name of oldChunkNames) {
    response.cookies.set(name, "", { ...opts, maxAge: 0 })
  }
  const CHUNK = 3500
  if (value.length <= CHUNK) {
    response.cookies.set(baseName, value, opts)
    return
  }
  // Clear the un-chunked variant if we're switching to chunked.
  response.cookies.set(baseName, "", { ...opts, maxAge: 0 })
  for (let i = 0, idx = 0; i < value.length; i += CHUNK, idx++) {
    response.cookies.set(`${baseName}.${idx}`, value.slice(i, i + CHUNK), opts)
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  // We DON'T use the cookie-bound server client for the DB queries below,
  // because @supabase/ssr never wires the user's JWT onto the outgoing
  // PostgREST requests when we skip auth.getUser() (the ES256 quirk). The
  // queries would then hit RLS as anon and silently return zero rows,
  // bouncing logged-in users to /login. The keep-cookies-fresh client is
  // still useful for the setAll side-effect, so we instantiate it but
  // route DB lookups through the service-role client below.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )
  void supabase

  // Service-role client for authority checks (profile is_master + workspace
  // membership). The proxy is server-only so the key is never exposed to
  // the browser, and these are admission decisions, not user-visible reads.
  const svc = createServiceClient(
    (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // Verified session resolution — read the cookie, then verify the JWT
  // signature against the project JWKS (or HS256 secret) before trusting
  // any claim. Without verification a forged cookie with any `sub` would
  // pass admission, since the downstream lookups go through service role.
  let session = readSessionFromCookies(request)
  let userId: string | null = null
  let needsCookieRefresh = false
  if (session?.access_token) {
    const claims = await verifyAccessToken(session.access_token)
    const now = Math.floor(Date.now() / 1000)
    const exp = claims?.exp ?? 0
    const expired = !!claims?.exp && exp <= now
    const nearExpiry = !!claims?.exp && exp - now < 300 // refresh w/in 5min
    const valid = !!claims?.sub && (!claims.exp || claims.exp > now)
    if (valid) {
      userId = claims!.sub
    }
    // Either expired (no userId yet) or close to expiry — try refresh so
    // the next 60min of requests don't have to. @supabase/ssr's own
    // refresh path is broken in this project (ES256 quirk), so we do it
    // manually against /auth/v1/token.
    if ((expired || nearExpiry) && session.refresh_token) {
      const fresh = await refreshSession(session.refresh_token)
      if (fresh) {
        session = fresh
        needsCookieRefresh = true
        const refClaims = await verifyAccessToken(fresh.access_token)
        if (refClaims?.sub) userId = refClaims.sub
      }
    }
  }

  // If we refreshed, persist the new tokens onto the pass-through response
  // up front. For redirect responses, redirectWithSession() below copies
  // them onto the new response object.
  const cookieNames = needsCookieRefresh ? findAuthCookieNames(request) : null
  if (needsCookieRefresh && session && cookieNames?.base) {
    writeSessionCookies(response, cookieNames.base, cookieNames.chunkNames, session)
  }
  function redirectWithSession(url: URL): NextResponse {
    const res = NextResponse.redirect(url)
    if (needsCookieRefresh && session && cookieNames?.base) {
      writeSessionCookies(res, cookieNames.base, cookieNames.chunkNames, session)
    }
    return res
  }

  const path = request.nextUrl.pathname

  // Allow root sign-up + auth pages without session
  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"))) {
    return response
  }

  // Path pattern: /{workspace-slug}/...
  const segments = path.split("/").filter(Boolean)
  const workspaceSlug = segments[0]
  const subPath = segments[1] ?? ""

  // Root path → redirect to user's primary workspace if logged in, otherwise to login picker
  if (!workspaceSlug) {
    if (!userId) {
      return redirectWithSession(new URL("/login", request.url))
    }
    // Two-step lookup: PostgREST's `workspace:workspaces(slug)` FK alias
    // join is unreliable in this codebase (see lib/people-server.ts +
    // lib/auth.ts). Fetch a membership row, then resolve its workspace.
    const { data: mem } = await svc
      .from("workspace_memberships")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()
    if (mem?.workspace_id) {
      const { data: ws } = await svc
        .from("workspaces")
        .select("slug")
        .eq("id", mem.workspace_id)
        .maybeSingle()
      if (ws?.slug) {
        return redirectWithSession(new URL(`/${ws.slug}`, request.url))
      }
    }
    return redirectWithSession(new URL("/login", request.url))
  }

  // Workspace login/signup pages — pass through
  if (AUTH_PATHS.includes("/" + subPath)) {
    return response
  }

  // All other workspace routes require auth
  if (!userId) {
    return redirectWithSession(new URL(`/${workspaceSlug}/login`, request.url))
  }

  // Verify user is a member of this workspace (or is master)
  const { data: profile } = await svc
    .from("profiles")
    .select("is_master")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.is_master) {
    const { data: ws } = await svc
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .maybeSingle()

    if (!ws) {
      return redirectWithSession(new URL("/login", request.url))
    }

    const { data: hasAccess } = await svc
      .from("workspace_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", ws.id)
      .eq("status", "active")
      .maybeSingle()

    if (!hasAccess) {
      return redirectWithSession(new URL("/login?error=no_access", request.url))
    }
  }

  return response
}

export const config = {
  // Skip Next internals, /api/* (handled by route handlers themselves),
  // common image extensions, and the PWA static files (manifest, sw,
  // .webmanifest, .ico) so they're served as-is from /public.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|ico)$).*)",
  ],
}
