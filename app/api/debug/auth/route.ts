import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getCurrentUser } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// TEMP debug endpoint — remove after diagnosing the auth-cookie issue.
// Reports exactly what the Node-side cookie reader sees so we can compare
// to what the browser sends.
export async function GET() {
  const store = await cookies()
  const all = store.getAll()
  const sb = all.filter((c) => c.name.startsWith("sb-"))
  const main = all.find((c) => /^sb-[^-]+-auth-token$/.test(c.name))
  const chunked = all.filter((c) => /^sb-[^-]+-auth-token\.\d+$/.test(c.name))
  let raw = main?.value ?? chunked.map((c) => c.value).join("")
  let preview = raw.slice(0, 30)
  let decoded: string | null = null
  let parsed: unknown = null
  let claims: unknown = null
  let userIdFromJwt: string | null = null
  let stage = "no-cookie"
  if (raw) {
    stage = "raw-found"
    if (raw.startsWith("base64-")) {
      try {
        raw = Buffer.from(raw.slice(7), "base64").toString("utf8")
        decoded = raw.slice(0, 60)
        stage = "decoded"
      } catch (e) {
        stage = "base64-decode-failed: " + (e instanceof Error ? e.message : "?")
      }
    }
    try {
      parsed = JSON.parse(raw)
      stage = "json-parsed"
      const tok = (parsed as { access_token?: string }).access_token
      if (tok) {
        const parts = tok.split(".")
        if (parts.length === 3) {
          const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/")
          const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4)
          claims = JSON.parse(Buffer.from(padded, "base64").toString("utf8"))
          stage = "jwt-decoded"
          userIdFromJwt = (claims as { sub?: string }).sub ?? null
        }
      }
    } catch (e) {
      stage = "json-parse-failed: " + (e instanceof Error ? e.message : "?")
    }
  }
  // Now call getCurrentUser to see what IT does with the same cookies.
  let getCurrentUserResult: unknown = null
  let getCurrentUserError: string | null = null
  try {
    const u = await getCurrentUser("orage-team")
    getCurrentUserResult = u
      ? { id: u.id, email: u.email, role: u.role, workspace: u.workspaceSlug }
      : null
  } catch (e) {
    getCurrentUserError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    stage,
    sbCookieNames: sb.map((c) => c.name),
    rawValuePreview: preview,
    decodedPreview: decoded,
    userIdFromJwt,
    claimsExp: (claims as { exp?: number } | null)?.exp ?? null,
    nowSec: Math.floor(Date.now() / 1000),
    getCurrentUserResult,
    getCurrentUserError,
  })
}
