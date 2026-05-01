"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { requirePermission } from "@/lib/server/permissions"
import { supabaseAdmin } from "@/lib/supabase/admin"

const VALID_ROLES = new Set(["founder", "admin", "leader", "member", "viewer", "field"])
const ELEVATED_ROLES = new Set(["founder", "admin"])

function isUuid(v: string | null | undefined): v is string {
  if (!v) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

function revalidatePeople(slug: string) {
  revalidatePath(`/${slug}/people`)
}

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

/**
 * Generate a magic-link invite. Returns the URL string that the inviter
 * can copy / paste / Slack — useful when the team doesn't want to depend
 * on email delivery.
 */
export async function generateInviteLink(
  workspaceSlug: string,
  data: {
    email: string
    fullName?: string
    role: string
  },
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "people:invite")
    const sb = supabaseAdmin()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
    const role = VALID_ROLES.has(data.role) ? data.role : "member"

    const { data: linkData, error } = await sb.auth.admin.generateLink({
      type: "invite",
      email: data.email,
      options: {
        data: {
          full_name: data.fullName ?? null,
          invited_workspace_id: user.workspaceId,
          invited_workspace_slug: workspaceSlug,
          invited_role: role,
          invited_by: user.id,
        },
        redirectTo: `${appUrl}/${workspaceSlug}/auth/callback`,
      },
    })

    if (error || !linkData?.properties?.action_link) {
      return { ok: false, error: error?.message ?? "Could not generate link" }
    }
    return { ok: true, url: linkData.properties.action_link }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function updateMembershipRole(
  workspaceSlug: string,
  userId: string,
  newRole: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "people:role")
    if (!isUuid(userId)) return { ok: false, error: "Invalid user id" }
    if (!VALID_ROLES.has(newRole)) return { ok: false, error: "Invalid role" }
    if (ELEVATED_ROLES.has(newRole) && !user.isMaster && user.role !== "founder") {
      return { ok: false, error: "Only founders or master can grant founder/admin." }
    }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("workspace_memberships")
      .update({ role: newRole })
      .eq("workspace_id", user.workspaceId)
      .eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
    revalidatePeople(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function suspendMembership(
  workspaceSlug: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "people:suspend")
    if (!isUuid(userId)) return { ok: false, error: "Invalid user id" }
    if (userId === user.id) {
      return { ok: false, error: "You cannot suspend yourself." }
    }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("workspace_memberships")
      .update({ status: "suspended" })
      .eq("workspace_id", user.workspaceId)
      .eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
    revalidatePeople(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function reactivateMembership(
  workspaceSlug: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    requirePermission(user, "people:suspend")
    if (!isUuid(userId)) return { ok: false, error: "Invalid user id" }
    const sb = supabaseAdmin()
    const { error } = await sb
      .from("workspace_memberships")
      .update({ status: "active" })
      .eq("workspace_id", user.workspaceId)
      .eq("user_id", userId)
    if (error) return { ok: false, error: error.message }
    revalidatePeople(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function updateProfile(
  workspaceSlug: string,
  userId: string,
  patch: { fullName?: string | null; avatarUrl?: string | null },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const user = await requireUser(workspaceSlug)
    if (!isUuid(userId)) return { ok: false, error: "Invalid user id" }
    // Self-edit is always OK; otherwise require people:role (founder/admin gating).
    if (userId !== user.id) {
      requirePermission(user, "people:role")
    }
    const sb = supabaseAdmin()
    const dbPatch: Record<string, unknown> = {}
    if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName?.trim() || null
    if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl?.trim() || null
    if (Object.keys(dbPatch).length === 0) {
      return { ok: false, error: "Nothing to update." }
    }
    const { error } = await sb
      .from("profiles")
      .update(dbPatch)
      .eq("id", userId)
    if (error) return { ok: false, error: error.message }
    revalidatePeople(workspaceSlug)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
