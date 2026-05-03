// ═══════════════════════════════════════════════════════════
// app/auth/callback/route.ts — Supabase OAuth + magic link handler
// ═══════════════════════════════════════════════════════════

import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

// Reject anything that could escape the same-origin path: protocol-relative
// `//evil.com`, userinfo-host tricks `@evil.com`, backslashes, or whitespace.
// Only allow paths that start with a single `/` and contain none of the above.
function safeRedirectPath(raw: string | null): string {
  if (!raw) return "/"
  if (!raw.startsWith("/")) return "/"
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/"
  if (/[\\\s]/.test(raw)) return "/"
  if (raw.includes("@")) return "/"
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = safeRedirectPath(searchParams.get("next"))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
