// ═══════════════════════════════════════════════════════════
// app/[workspace]/auth/callback/route.ts
// Workspace-scoped OAuth callback — handles invite acceptances.
// Exchanges the auth code, then inserts the membership row if
// the user was invited to a specific workspace.
// ═══════════════════════════════════════════════════════════

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspace: string }> },
) {
  const { workspace } = await params
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const meta = data.user.user_metadata as {
        invited_workspace_id?: string
        invited_role?: string
      }

      if (meta.invited_workspace_id) {
        const sb = supabaseAdmin()
        await sb
          .from("workspace_memberships")
          .upsert(
            {
              user_id: data.user.id,
              workspace_id: meta.invited_workspace_id,
              role: meta.invited_role ?? "member",
              status: "active",
            },
            { onConflict: "user_id,workspace_id" },
          )
          .then(({ error: e }) => {
            if (e) console.error("[v0] invite membership upsert error", e.message)
          })
      }

      return NextResponse.redirect(`${origin}/${workspace}`)
    }
  }

  return NextResponse.redirect(
    `${origin}/${workspace}/login?error=auth_callback_failed`,
  )
}
