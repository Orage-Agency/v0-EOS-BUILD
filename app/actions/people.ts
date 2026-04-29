"use server"

import { requireUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export async function sendWorkspaceInvite(
  workspaceSlug: string,
  data: {
    email: string
    fullName?: string
    role: string
    note?: string
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    const sb = supabaseAdmin()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

    const { error } = await sb.auth.admin.inviteUserByEmail(data.email, {
      data: {
        full_name: data.fullName ?? null,
        invited_workspace_id: user.workspaceId,
        invited_workspace_slug: workspaceSlug,
        invited_role: data.role,
        invited_by: user.id,
        invite_note: data.note ?? null,
      },
      redirectTo: `${appUrl}/${workspaceSlug}/auth/callback`,
    })

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
