/**
 * Public sign-out endpoint. Clears the Supabase auth-token cookie so
 * the next request lands as anonymous, then redirects to /login.
 *
 * Used by the no_access error block in /login (a user signed in under
 * the wrong account) and by anywhere else that wants a one-click
 * 'sign me out' affordance.
 */
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const store = await cookies()
  const all = store.getAll()
  const url = new URL(req.url)
  const response = NextResponse.redirect(new URL("/login", url.origin))
  // Drop every sb-*-auth-token cookie + chunked variants. We don't know
  // the exact project ref at runtime here, so match by pattern.
  for (const c of all) {
    if (/^sb-.*-auth-token(\.\d+)?$/.test(c.name) || /^oc_/.test(c.name)) {
      response.cookies.set({
        name: c.name,
        value: "",
        path: "/",
        maxAge: 0,
      })
    }
  }
  return response
}
