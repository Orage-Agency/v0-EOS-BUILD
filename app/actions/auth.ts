// ═══════════════════════════════════════════════════════════
// app/actions/auth.ts — server actions for auth flows
// ═══════════════════════════════════════════════════════════

"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

function appUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

// ─── SIGN UP (master role only — for bootstrapping George) ───
export async function signUpMaster(email: string, password: string, fullName: string) {
  if (password.length < 8) return { error: "Password must be at least 8 characters" }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${appUrl()}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  return { success: true, userId: data.user?.id }
}

// ─── LOG IN ───
export async function login(workspaceSlug: string, email: string, password: string, rememberMe: boolean) {
  void rememberMe
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: "Invalid email or password" }

  // Verify user has access to this workspace
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Authentication failed" }

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
      await supabase.auth.signOut()
      return { error: "Workspace not found" }
    }

    const { data: membership } = await supabase
      .from("workspace_memberships")
      .select("id")
      .eq("user_id", user.id)
      .eq("workspace_id", ws.id)
      .eq("status", "active")
      .single()

    if (!membership) {
      await supabase.auth.signOut()
      return { error: "You do not have access to this workspace" }
    }
  }

  redirect(`/${workspaceSlug}`)
}

// ─── MAGIC LINK FALLBACK ───
export async function sendMagicLink(workspaceSlug: string, email: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback?next=/${workspaceSlug}`,
    },
  })

  if (error) return { error: error.message }
  return { success: true }
}

// ─── GOOGLE OAUTH ───
export async function signInWithGoogle(workspaceSlug: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl()}/auth/callback?next=/${workspaceSlug}`,
    },
  })

  if (error) return { error: error.message }
  if (data.url) redirect(data.url)
}

// ─── LOG OUT ───
export async function logout(workspaceSlug?: string) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(workspaceSlug ? `/${workspaceSlug}/login` : "/login")
}

// ─── CREATE INVITE LINK ───
export async function createInvite(
  workspaceSlug: string,
  email: string,
  role: "admin" | "leader" | "member" | "viewer",
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: ws } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", workspaceSlug)
    .single()

  if (!ws) return { error: "Workspace not found" }

  // Permission check happens via RLS — only admin+ can insert
  const token = crypto.randomBytes(32).toString("hex")

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: ws.id,
    email,
    role,
    token,
    invited_by: user.id,
  })

  if (error) return { error: error.message }

  const link = `${appUrl()}/accept-invite?token=${token}`

  revalidatePath(`/${workspaceSlug}/settings/members`)
  return { success: true, link }
}

// ─── ACCEPT INVITE (from /accept-invite?token=xxx page) ───
//
// Two-client dance:
//   • `supabase` (SSR + cookies) creates the new auth.users row and
//     installs the freshly-signed-up user's session cookies on the
//     server-action response so the client lands logged-in.
//   • `admin` (service role) writes the workspace_membership row and
//     marks the invite accepted, because the new user has no role yet
//     and would be blocked by `admins_manage_memberships` RLS.
export async function acceptInvite(token: string, password: string, fullName: string) {
  if (password.length < 8) return { error: "Password must be at least 8 characters" }

  const supabase = await createClient()
  const admin = supabaseAdmin()

  // Look up invite via the public RLS read policy, but go through the
  // admin client to avoid relying on `public_read_pending_invite_by_token`
  // semantics changing between environments.
  const { data: invite, error: inviteError } = await admin
    .from("workspace_invites")
    .select("id, workspace_id, email, role, status, expires_at, workspace:workspaces(slug)")
    .eq("token", token)
    .single()

  if (inviteError || !invite) return { error: "Invalid invite link" }
  if (invite.status !== "pending") return { error: "This invite has already been used" }
  if (new Date(invite.expires_at) < new Date()) return { error: "This invite has expired" }

  // Sign up. With "Confirm email" turned OFF in Supabase Auth settings,
  // this both creates the row in auth.users (handle_new_user trigger
  // creates the profile) and sets the session cookies on the response.
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: invite.email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (signUpError) return { error: signUpError.message }
  if (!signUpData.user) return { error: "Sign up failed" }

  const userId = signUpData.user.id

  // Use the service-role client for the membership insert + invite mark
  // so RLS does not bounce the request. The new user has no role in this
  // workspace yet, so `admins_manage_memberships` would otherwise reject.
  const { error: membershipError } = await admin
    .from("workspace_memberships")
    .insert({
      workspace_id: invite.workspace_id,
      user_id: userId,
      role: invite.role,
    })

  if (membershipError) {
    // Clean up the auth.users row so the invitee can retry without
    // hitting "email already exists" on a partially-broken state.
    await admin.auth.admin.deleteUser(userId)
    return { error: `Could not join workspace: ${membershipError.message}` }
  }

  await admin
    .from("workspace_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    })
    .eq("id", invite.id)

  // Supabase relational selects can return the relation as an object or
  // an array depending on cardinality — normalize both shapes.
  const wsRel = invite.workspace as
    | { slug: string }
    | { slug: string }[]
    | null
  const slug = Array.isArray(wsRel) ? wsRel[0]?.slug : wsRel?.slug
  if (!slug) {
    return { error: "Workspace not found for this invite" }
  }

  redirect(`/${slug}`)
}

// ─── CHANGE PASSWORD (signed-in user only) ───
export async function changePassword(newPassword: string) {
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not signed in" }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}

// ─── REVOKE INVITE ───
export async function revokeInvite(inviteId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("workspace_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)

  if (error) return { error: error.message }
  return { success: true }
}
