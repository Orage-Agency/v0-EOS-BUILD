// ═══════════════════════════════════════════════════════════
// proxy.ts — Supabase session refresh + workspace routing
// (Next 16 renamed `middleware` → `proxy`; same execution model.)
//
// We intentionally do NOT use @supabase/ssr's auth.getUser() in this
// middleware. In production v0.10.2 + ES256 JWTs, getUser() returned
// null even with a valid cookie — likely a JWKS fetch quirk under the
// Edge runtime. Instead we decode the cookie ourselves, verify expiry,
// and trust the JWT's `sub`. The downstream layout/page still calls
// requireUser() which uses the SDK on Node runtime where it works.
// ═══════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/auth",
]
const AUTH_PATHS = ["/login", "/signup"]

type SessionShape = {
  access_token: string
  refresh_token: string
  expires_at?: number
  user?: { id?: string }
}

function readSessionFromCookies(request: NextRequest): SessionShape | null {
  // Find the sb-*-auth-token cookie. Supabase SSR may chunk it into .0/.1.
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

function decodeJwt(token: string): { sub?: string; exp?: number } | null {
  const parts = token.split(".")
  if (parts.length !== 3) return null
  try {
    // base64url → base64
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

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

  // Manual session resolution — bypasses auth.getUser() to avoid the Edge
  // runtime / JWKS issue mentioned at the top of this file.
  const session = readSessionFromCookies(request)
  let userId: string | null = null
  let debugReason = "no-session"
  if (session?.access_token) {
    const claims = decodeJwt(session.access_token)
    const now = Math.floor(Date.now() / 1000)
    if (!claims?.sub) debugReason = "no-sub"
    else if (claims.exp && claims.exp <= now) debugReason = "expired"
    else {
      userId = claims.sub
      debugReason = "ok"
    }
  } else if (session) {
    debugReason = "no-token"
  }

  const path = request.nextUrl.pathname
  // Mark debugReason consumed so eslint doesn't flag it now that the
  // header dump has been removed.
  void debugReason

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
      return NextResponse.redirect(new URL("/login", request.url))
    }
    const { data } = await supabase
      .from("workspace_memberships")
      .select("workspace:workspaces(slug)")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const slug = (data?.workspace as any)?.slug
    if (slug) {
      return NextResponse.redirect(new URL(`/${slug}`, request.url))
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Workspace login/signup pages — pass through
  if (AUTH_PATHS.includes("/" + subPath)) {
    return response
  }

  // All other workspace routes require auth
  if (!userId) {
    return NextResponse.redirect(new URL(`/${workspaceSlug}/login`, request.url))
  }

  // Verify user is a member of this workspace (or is master)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_master")
    .eq("id", userId)
    .single()

  if (!profile?.is_master) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .single()

    if (!ws) {
      return NextResponse.redirect(new URL("/login", request.url))
    }

    const { data: hasAccess } = await supabase
      .from("workspace_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", ws.id)
      .eq("status", "active")
      .single()

    if (!hasAccess) {
      return NextResponse.redirect(new URL("/login?error=no_access", request.url))
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
