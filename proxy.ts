// ═══════════════════════════════════════════════════════════
// proxy.ts — Supabase session refresh + workspace routing
// (Next 16 renamed `middleware` → `proxy`; same execution model.)
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

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // TEMP DEBUG — remove once login redirect issue is resolved.
  if (path === "/orage-team" || path.startsWith("/orage-team/")) {
    console.log("[proxy/debug]", {
      path,
      hasUser: !!user,
      userEmail: user?.email,
      authErr: authErr?.message,
      cookieNames: request.cookies.getAll().map((c) => c.name),
    })
  }

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
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    // Find user's first workspace
    const { data } = await supabase
      .from("workspace_memberships")
      .select("workspace:workspaces(slug)")
      .eq("user_id", user.id)
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
  if (!user) {
    return NextResponse.redirect(new URL(`/${workspaceSlug}/login`, request.url))
  }

  // Verify user is a member of this workspace (or is master)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_master")
    .eq("id", user.id)
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
      .eq("user_id", user.id)
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
