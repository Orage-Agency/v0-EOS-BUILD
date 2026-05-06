// ═══════════════════════════════════════════════════════════
// app/actions/auth.ts — server actions for auth flows
// ═══════════════════════════════════════════════════════════

"use server"

import { createClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import crypto from "crypto"
import { ssoRequirementForEmail } from "@/app/actions/sso"
import { sendEmail, htmlToText } from "@/lib/email"
import { inviteEmail } from "@/lib/email-templates"
import { getCurrentUser, getAuthUserIdFromCookie } from "@/lib/auth"
import { requirePermission, PermissionError } from "@/lib/server/permissions"
import { checkAuthRateLimit } from "@/lib/auth-rate-limit"
import { generateTempPassword } from "@/lib/temp-password"

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

// ─── SIGN UP A NEW WORKSPACE (real customer flow) ───
//
// Creates the auth user, the workspace, and the founder membership in one
// shot, then signs the user in so the redirect immediately lands on the
// onboarding wizard. This is what /signup wires up — replaces the
// master-only bootstrap path.

// Re-import from lib/slug — "use server" files can only export async functions.
import { slugify, SLUG_RE } from "@/lib/slug"

async function uniqueSlug(
  base: string,
  admin: ReturnType<typeof supabaseAdmin>,
): Promise<string> {
  const seed = base || "workspace"
  // Try seed, seed-2, seed-3, ... up to 50 attempts.
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? seed : `${seed}-${i + 1}`
    const { data } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle()
    if (!data) return candidate
  }
  // Last-ditch random suffix.
  return `${seed}-${crypto.randomBytes(3).toString("hex")}`
}

export type SignUpWorkspaceResult =
  | { ok: true; slug: string }
  | { ok: false; error: string }

export async function signUpWorkspace(input: {
  email: string
  password: string
  // Optional. If blank, we derive a friendly placeholder from the email
  // local-part — the user can rename themselves later in settings.
  fullName?: string
  // Optional. If blank, we use the email local-part as the workspace name
  // and slug seed. Founder can rename anytime in settings.
  workspaceName?: string
}): Promise<SignUpWorkspaceResult> {
  const limit = await checkAuthRateLimit("signup")
  if (!limit.ok) return { ok: false, error: limit.message }

  const email = input.email.trim().toLowerCase()
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email." }
  if (input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." }

  // Friendly defaults so signup never blocks on an unfilled name field.
  const localPart = email.split("@")[0] ?? "founder"
  const fullName = (input.fullName ?? "").trim() || localPart
  const wsName = (input.workspaceName ?? "").trim() || localPart

  const supabase = await createClient()
  const admin = supabaseAdmin()

  // 1) Create the auth user via the admin API with email_confirm:true so
  //    the user is pre-confirmed regardless of the project-wide "Confirm
  //    email" setting. The handle_new_user trigger creates the profile.
  //    Then immediately sign them in via signInWithPassword so the
  //    response sets the session cookies and they land logged-in.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createErr || !created.user) {
    // Treat "already registered" as a precondition error so the UI can
    // direct the visitor to /login without leaking which emails exist.
    const msg = createErr?.message ?? "Sign-up failed."
    if (/already.*registered|exists/i.test(msg)) {
      return { ok: false, error: "An account already exists for that email. Try signing in." }
    }
    return { ok: false, error: msg }
  }
  const userId = created.user.id

  // Ensure a profile row exists. The handle_new_user trigger isn't
  // installed in this project's migrations, so admin.createUser does
  // NOT auto-create a profile. Without one, RLS-bound queries (e.g.
  // proxy.ts membership checks) silently return zero rows. Upsert so
  // we're idempotent against any future trigger that does fire.
  await admin
    .from("profiles")
    .upsert(
      { id: userId, email, full_name: fullName },
      { onConflict: "id" },
    )

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
  })
  if (signInErr) {
    // Don't roll back — the user was created and they can sign in
    // directly at /login. Surface a clear next step.
    return { ok: false, error: "Account created — please sign in." }
  }

  // 2) Create the workspace with a unique slug derived from the name.
  const slug = await uniqueSlug(slugify(wsName), admin)
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: `Could not derive a valid slug from "${wsName}".` }
  }
  const { data: ws, error: wsErr } = await admin
    .from("workspaces")
    .insert({
      slug,
      name: wsName,
      created_by: userId,
      status: "active",
    })
    .select("id, slug")
    .single()
  if (wsErr || !ws) {
    // Roll back the auth user so the next attempt isn't blocked by "email
    // already exists" on a half-created state.
    await admin.auth.admin.deleteUser(userId).catch(() => {})
    return { ok: false, error: `Couldn't create workspace: ${wsErr?.message ?? "unknown"}` }
  }

  // 3) Founder membership.
  const { error: memErr } = await admin.from("workspace_memberships").insert({
    workspace_id: ws.id as string,
    user_id: userId,
    role: "founder",
    status: "active",
  })
  if (memErr) {
    // Don't roll back the workspace — it's a recoverable orphan, but the
    // user can't access it without the membership. Surface the error.
    return { ok: false, error: `Couldn't add membership: ${memErr.message}` }
  }

  // Use redirect() directly so Next.js flushes the Supabase session
  // cookies on the redirect response. Returning a payload + router.push
  // can drop cookies set during the action in some versions.
  redirect(`/${ws.slug as string}`)
}

// ─── LOG IN BY EMAIL (workspace-agnostic) ───
//
// Used by the top-level /login page. Authenticates by email + password,
// then resolves the user's first active workspace and returns its slug
// so the client can redirect. If the user has no workspace yet, we send
// them to /signup to create one.
// Returned only when the action does NOT redirect (errors only on the
// success path because we redirect server-side to flush session cookies).
export type LoginByEmailResult = { ok: false; error: string }

export async function loginByEmail(
  email: string,
  password: string,
): Promise<LoginByEmailResult | undefined> {
  const limit = await checkAuthRateLimit("login")
  if (!limit.ok) return { ok: false, error: limit.message }

  const supabase = await createClient()

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error || !signInData.user) {
    return { ok: false, error: "Invalid email or password" }
  }

  // 2FA gate: if the user has a verified TOTP factor, the session AAL
  // will currently be aal1 but the user's nextLevel is aal2. Send them
  // to /login/mfa to provide the code before completing sign-in.
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (
    aal.data &&
    aal.data.currentLevel === "aal1" &&
    aal.data.nextLevel === "aal2"
  ) {
    redirect("/login/mfa")
  }

  // Master users can land at the picker. Everyone else gets routed to
  // their first active workspace.
  const admin = supabaseAdmin()
  const userId = signInData.user.id

  const { data: profile } = await admin
    .from("profiles")
    .select("is_master")
    .eq("id", userId)
    .maybeSingle()

  if (profile?.is_master) {
    redirect("/")
  }

  // Two-step lookup — PostgREST FK alias filter is unreliable here.
  // The membership table's timestamp column is `joined_at`, not created_at.
  const { data: mem } = await admin
    .from("workspace_memberships")
    .select("workspace_id, joined_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!mem?.workspace_id) {
    // No active membership. If they have a pending invite for this email
    // (e.g. they signed in with the fallback password the admin shared
    // before clicking the invite link), auto-accept it and route them to
    // the workspace. Otherwise drop them at /signup to create their own.
    const cleanEmail = (signInData.user.email ?? "").toLowerCase()
    const { data: invite } = await admin
      .from("workspace_invites")
      .select("id, workspace_id, role, expires_at")
      .eq("email", cleanEmail)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (invite && new Date(invite.expires_at as string) >= new Date()) {
      // Insert membership; tolerate the unique-violation case so a double
      // login doesn't error.
      const { error: memErr } = await admin
        .from("workspace_memberships")
        .insert({
          workspace_id: invite.workspace_id as string,
          user_id: userId,
          role: invite.role as string,
          status: "active",
        })
      if (
        memErr &&
        memErr.code !== "23505" &&
        !/duplicate|already exists/i.test(memErr.message)
      ) {
        return { ok: false, error: `Could not join workspace: ${memErr.message}` }
      }

      await admin
        .from("workspace_invites")
        .update({
          status: "accepted",
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
          temp_password: null,
        })
        .eq("id", invite.id as string)

      const { data: ws } = await admin
        .from("workspaces")
        .select("slug")
        .eq("id", invite.workspace_id as string)
        .maybeSingle()

      if (ws?.slug) {
        redirect(`/${ws.slug as string}`)
      }
    }

    redirect("/signup")
  }

  const { data: ws } = await admin
    .from("workspaces")
    .select("slug")
    .eq("id", mem.workspace_id)
    .maybeSingle()

  if (!ws?.slug) {
    // Membership exists but workspace was deleted/orphaned — bounce to
    // signup so the user can recover with a new workspace.
    redirect("/signup")
  }

  redirect(`/${ws.slug as string}`)
}

// ─── LOG IN (legacy workspace-scoped form, used by /[workspace]/login) ───
export async function login(workspaceSlug: string, email: string, password: string, rememberMe: boolean) {
  void rememberMe

  const limit = await checkAuthRateLimit("login")
  if (!limit.ok) return { error: limit.message }

  // SSO enforcement: block password sign-in for emails on a domain that
  // requires SSO and surface the redirect URL the login UI will use.
  const ssoCheck = await ssoRequirementForEmail(workspaceSlug, email)
  if (ssoCheck.enforced) {
    return {
      error: `Your domain requires sign-in via ${ssoCheck.displayName ?? "SSO"}.`,
      ssoProviderId: ssoCheck.providerId,
    }
  }

  const supabase = await createClient()

  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { error: "Invalid email or password" }
  // signInWithPassword returns the user directly — no need to round-trip
  // through auth.getUser(), which is broken in this codebase anyway.
  const userId = signInData.user?.id
  if (!userId) return { error: "Authentication failed" }

  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("is_master")
    .eq("id", userId)
    .maybeSingle()

  if (!profile?.is_master) {
    const { data: ws } = await admin
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .maybeSingle()

    if (!ws) {
      await supabase.auth.signOut()
      return { error: "Workspace not found" }
    }

    const { data: membership } = await admin
      .from("workspace_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("workspace_id", ws.id)
      .eq("status", "active")
      .maybeSingle()

    if (!membership) {
      await supabase.auth.signOut()
      return { error: "You do not have access to this workspace" }
    }
  }

  redirect(`/${workspaceSlug}`)
}

// ─── FORGOT PASSWORD — SEND RECOVERY LINK ───
//
// Sends Supabase Auth's password-recovery email. Always returns success
// to the caller (even when the email isn't registered) so a malicious
// visitor can't enumerate accounts off the response. The redirect URL
// goes through /auth/callback so we own where the user lands after they
// click the link in the email.
export async function sendPasswordRecovery(rawEmail: string) {
  const limit = await checkAuthRateLimit("magic-link")
  if (!limit.ok) return { ok: false, error: limit.message }

  const email = rawEmail.trim().toLowerCase()
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email." }
  }

  const { createAnonClient } = await import("@/lib/supabase/anon")
  const anon = createAnonClient()

  const redirectTo = `${appUrl()}/auth/callback?next=${encodeURIComponent("/reset-password")}`
  const { error } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo,
  })
  // Soft-log only — never reveal "no such user" to the caller.
  if (error) {
    console.error("[sendPasswordRecovery] resetPasswordForEmail failed", error.message)
  }
  return { ok: true }
}

// ─── RESET PASSWORD (signed-in via recovery link) ───
//
// The recovery link lands the user in /auth/callback with a session
// established by Supabase. The /reset-password page then calls this
// action with the new password. We rotate it via supabase.auth.updateUser
// (uses the cookie-bound session — works in server actions where
// auth.getUser() works in Node runtime).
export async function resetPasswordWithSession(newPassword: string) {
  if (newPassword.length < 8) {
    return { ok: false as const, error: "Password must be at least 8 characters" }
  }

  const userId = await getAuthUserIdFromCookie()
  if (!userId) {
    return {
      ok: false as const,
      error:
        "Recovery session expired. Request a new link from /forgot-password.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { ok: false as const, error: error.message }

  redirect("/login?reset=ok")
}

// ─── MAGIC LINK FALLBACK ───
export async function sendMagicLink(workspaceSlug: string, email: string) {
  const limit = await checkAuthRateLimit("magic-link")
  if (!limit.ok) return { error: limit.message }

  // Block magic-link sign-in too if the user's domain requires SSO.
  const ssoCheck = await ssoRequirementForEmail(workspaceSlug, email)
  if (ssoCheck.enforced) {
    return {
      error: `Your domain requires sign-in via ${ssoCheck.displayName ?? "SSO"}.`,
    }
  }

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
  // requireUser() can't be called from inside a "use server" file because
  // it redirects on failure (which the catch-block UI can't recover from).
  // Use getCurrentUser instead so we surface a normal error.
  const user = await getCurrentUser(workspaceSlug)
  if (!user) return { error: "Not authenticated" }

  try {
    requirePermission(user, "people:invite")
  } catch (e) {
    if (e instanceof PermissionError) return { error: e.message }
    throw e
  }

  const supabase = await createClient()
  const { data: ws } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .single()

  if (!ws) return { error: "Workspace not found" }
  // user.workspaceId already verified membership in this workspace.
  if ((ws.id as string) !== user.workspaceId) return { error: "Workspace mismatch" }

  const token = crypto.randomBytes(32).toString("hex")
  const tempPassword = generateTempPassword()
  const inviteeEmail = email.trim().toLowerCase()

  // Pre-create the auth user with the temp password so the admin can
  // share credentials immediately if the invite email fails. If the user
  // already exists (e.g., they're being invited to a 2nd workspace),
  // skip creation — keep their existing password intact.
  const admin = supabaseAdmin()
  let createdAuthUser = false
  let preCreatedUserId: string | null = null
  try {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: inviteeEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: inviteeEmail.split("@")[0] ?? "member" },
    })
    if (createErr) {
      // "already registered" is fine — fall through.
      if (!/already.*registered|exists/i.test(createErr.message)) {
        console.error("[createInvite] admin.createUser failed", createErr.message)
      }
    } else if (created.user) {
      createdAuthUser = true
      preCreatedUserId = created.user.id
      // Mirror signUp pattern: ensure profile row exists for proxy/RLS.
      await admin
        .from("profiles")
        .upsert(
          { id: preCreatedUserId, email: inviteeEmail, full_name: inviteeEmail.split("@")[0] ?? "member" },
          { onConflict: "id" },
        )
    }
  } catch (e) {
    // Don't fail the whole invite on auth-user creation hiccup. Admin can
    // still share the link; acceptInvite handles existing-or-new users.
    console.error("[createInvite] admin.createUser exception", e)
  }

  // Only persist the temp password if WE created the auth user this
  // request. For pre-existing users, we don't know (and shouldn't reveal)
  // their password.
  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: ws.id,
    email: inviteeEmail,
    role,
    token,
    invited_by: user.id,
    temp_password: createdAuthUser ? tempPassword : null,
  })

  if (error) {
    // Roll back the just-created auth user so a retry isn't blocked by
    // "email already exists".
    if (preCreatedUserId) {
      await admin.auth.admin.deleteUser(preCreatedUserId).catch(() => {})
    }
    return { error: error.message }
  }

  const link = `${appUrl()}/accept-invite?token=${token}`

  // Look up the inviter's display name for the email body. Fail soft —
  // the invite link is still returned to the UI even if email/profile
  // fetch errors out.
  const { data: inviter } = await admin
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle()
  const inviterName =
    (inviter?.full_name as string | undefined) ??
    (inviter?.email as string | undefined) ??
    user.email ??
    "An admin"

  const { subject, html } = inviteEmail({
    workspaceName: (ws.name as string) ?? "your workspace",
    inviteUrl: link,
    inviterName,
    role,
  })

  // GUARANTEED-DELIVERY PATH: send a magic-link email through Supabase's
  // built-in email infrastructure. This works without any external SMTP
  // setup. The link routes through /auth/callback so the recipient lands
  // at /accept-invite?token=T already authenticated as their email — the
  // accept handler then just sets a password and joins the workspace.
  // We use a fresh anonymous client so we don't disturb the inviter's
  // session cookies on this server-action response.
  const callbackUrl = `${appUrl()}/auth/callback?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`
  const { createAnonClient } = await import("@/lib/supabase/anon")
  const anon = createAnonClient()
  const { error: otpErr } = await anon.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: callbackUrl },
  })
  if (otpErr) {
    console.error("[createInvite] supabase OTP send failed", otpErr.message)
  }

  // OPTIONAL BRANDED PATH: also fire the Resend email when configured. No-op
  // when RESEND_API_KEY is unset, so this is safe in any environment.
  sendEmail({ to: email, subject, html, text: htmlToText(html) }).catch((e) => {
    console.error("[createInvite] sendEmail failed", e)
  })

  revalidatePath(`/${workspaceSlug}/settings/members`)
  return {
    success: true,
    link,
    // Only returned for newly-created auth users. Existing users keep their
    // own password; the inviter shouldn't see anything for them.
    tempPassword: createdAuthUser ? tempPassword : null,
  }
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
export async function acceptInvite(token: string, password: string, fullName?: string) {
  const limit = await checkAuthRateLimit("accept-invite")
  if (!limit.ok) return { error: limit.message }

  if (password.length < 8) return { error: "Password must be at least 8 characters" }

  const supabase = await createClient()
  const admin = supabaseAdmin()
  // Default the display name to the email local-part so a blank field
  // doesn't block onboarding. Filled in below once we know the email.
  const displayName = (fullName ?? "").trim()

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

  const inviteeEmail = (invite.email as string).toLowerCase()
  const resolvedName = displayName || (inviteeEmail.split("@")[0] ?? "member")

  // The accept page is reachable two ways:
  //   1) The recipient clicked the Supabase magic-link in the invite email →
  //      they already have a confirmed session for `inviteeEmail`. We just
  //      set a password on the existing user.
  //   2) Someone copy-pasted the /accept-invite?token=… link without going
  //      through email → no session yet. We sign up normally.
  // Use the verified-cookie identity (lib/auth.ts) to detect path 1 —
  // supabase.auth.getUser() returns null in this codebase even with a
  // valid session cookie (ES256 + @supabase/ssr quirk).
  const sessionUserId = await getAuthUserIdFromCookie()
  let existingSessionUser: { id: string; email: string | null } | null = null
  if (sessionUserId) {
    const { data: prof } = await admin
      .from("profiles")
      .select("id, email")
      .eq("id", sessionUserId)
      .maybeSingle()
    if (prof) {
      existingSessionUser = {
        id: prof.id as string,
        email: (prof.email as string | null) ?? null,
      }
    }
  }

  let userId: string
  let createdNewUser = false

  if (
    existingSessionUser &&
    existingSessionUser.email?.toLowerCase() === inviteeEmail
  ) {
    // Magic-link path. Set the password + display name on the existing
    // auth.users row.
    const { error: pwErr } = await supabase.auth.updateUser({
      password,
      data: { full_name: resolvedName },
    })
    if (pwErr) return { error: pwErr.message }
    userId = existingSessionUser.id
  } else {
    // Direct-link path — no session yet. Look up the auth user that
    // createInvite pre-created at invite time. If found, just rotate
    // their password to whatever the invitee chose. If not found (older
    // invite from before the pre-create flow, or admin.createUser failed
    // at invite time), fall through to create them now.
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
    const existingByEmail = list.users.find(
      (u) => u.email?.toLowerCase() === inviteeEmail,
    )

    if (existingByEmail) {
      const { error: updErr } = await admin.auth.admin.updateUserById(
        existingByEmail.id,
        {
          password,
          email_confirm: true,
          user_metadata: { full_name: resolvedName },
        },
      )
      if (updErr) return { error: updErr.message }
      userId = existingByEmail.id

      await admin
        .from("profiles")
        .upsert(
          { id: userId, email: inviteeEmail, full_name: resolvedName },
          { onConflict: "id" },
        )
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: inviteeEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: resolvedName },
      })
      if (createErr || !created.user) {
        const msg = createErr?.message ?? "Sign up failed"
        return { error: msg }
      }
      userId = created.user.id
      createdNewUser = true

      await admin
        .from("profiles")
        .upsert(
          { id: userId, email: inviteeEmail, full_name: resolvedName },
          { onConflict: "id" },
        )
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: inviteeEmail,
      password,
    })
    if (signInErr) {
      // The user is created and confirmed — they just couldn't be
      // auto-signed-in. Membership creation continues below; the
      // recipient can sign in via /login.
      console.error("[acceptInvite] auto sign-in failed", signInErr.message)
    }
  }

  // Use the service-role client for the membership insert + invite mark
  // so RLS does not bounce the request. The new user has no role in this
  // workspace yet, so `admins_manage_memberships` would otherwise reject.
  // The insert is idempotent against the (workspace_id, user_id) unique
  // constraint — repeated clicks just no-op.
  const { error: membershipError } = await admin
    .from("workspace_memberships")
    .insert({
      workspace_id: invite.workspace_id,
      user_id: userId,
      role: invite.role,
    })

  // Postgres unique-violation = already a member. Treat as success.
  const isDuplicate =
    membershipError &&
    (membershipError.code === "23505" ||
      /duplicate|already exists/i.test(membershipError.message))

  if (membershipError && !isDuplicate) {
    // Only roll back the auth.users row if we created it on this request.
    // Existing users (magic-link path) must NOT be deleted — they may have
    // memberships in other workspaces.
    if (createdNewUser) {
      await admin.auth.admin.deleteUser(userId).catch(() => {})
    }
    return { error: `Could not join workspace: ${membershipError.message}` }
  }

  await admin
    .from("workspace_invites")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
      // The user picked their own password — clear the fallback so it's
      // no longer recoverable from the members UI.
      temp_password: null,
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

// ─── CHANGE DISPLAY NAME (signed-in user only) ───
//
// Updates `profiles.full_name` AND auth.users user_metadata.full_name so
// the new name shows up everywhere (sidebar, AI prompts, audit log,
// invitee notifications). Both writes succeed-or-fail together.
export async function changeProfileName(newName: string) {
  const trimmed = newName.trim()
  if (!trimmed) return { error: "Name can't be empty" }
  if (trimmed.length > 80) return { error: "Name must be 80 characters or less" }

  // Manual cookie decode — supabase.auth.getUser() returns null in this
  // project (ES256 + @supabase/ssr quirk).
  const userId = await getAuthUserIdFromCookie()
  if (!userId) return { error: "Not signed in" }

  const supabase = await createClient()
  const { error: metaErr } = await supabase.auth.updateUser({
    data: { full_name: trimmed },
  })
  if (metaErr) return { error: metaErr.message }

  const admin = supabaseAdmin()
  const { error: profErr } = await admin
    .from("profiles")
    .update({ full_name: trimmed })
    .eq("id", userId)
  if (profErr) return { error: profErr.message }

  return { success: true, name: trimmed }
}

// ─── CHANGE PASSWORD (signed-in user only) ───
export async function changePassword(newPassword: string) {
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" }
  }

  // Manual verified decode — supabase.auth.getUser() returns null in
  // this codebase (ES256 + @supabase/ssr quirk).
  const userId = await getAuthUserIdFromCookie()
  if (!userId) return { error: "Not signed in" }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: error.message }
  return { success: true }
}

// ─── 2FA / TOTP MFA ───
//
// Supabase Auth's MFA primitives. Flow:
//   • startMfaEnrollment  → returns QR + secret. User scans w/ Authy/1Password.
//   • finishMfaEnrollment → user types the 6-digit code → factor becomes verified.
//   • disableMfa          → unenrolls the factor (requires another code).
//   • listMfaFactors      → tells the UI whether 2FA is on.
//
// The login gate (loginByEmail) checks getAuthenticatorAssuranceLevel
// after password sign-in. If the user has a verified factor but session
// is only aal1, we redirect them to /login/mfa to satisfy the challenge
// before letting them into the workspace.

export async function listMfaFactors() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return { ok: false as const, error: error.message }
  // Only verified factors count as "2FA on" — unverified factors are leftover
  // enrollment attempts the user abandoned.
  const verifiedTotp = (data.totp ?? []).filter((f) => f.status === "verified")
  return {
    ok: true as const,
    enabled: verifiedTotp.length > 0,
    factors: verifiedTotp.map((f) => ({
      id: f.id,
      friendlyName: f.friendly_name ?? "Authenticator app",
      createdAt: f.created_at,
    })),
  }
}

export async function startMfaEnrollment() {
  const userId = await getAuthUserIdFromCookie()
  if (!userId) return { ok: false as const, error: "Not signed in" }

  const supabase = await createClient()
  const admin = supabaseAdmin()

  // Clean up any unverified factors from prior abandoned attempts so we
  // don't accumulate ghost records under each user.
  const { data: existing } = await supabase.auth.mfa.listFactors()
  for (const f of existing?.totp ?? []) {
    if (f.status !== "verified") {
      await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId }).catch(() => {})
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `Orage Core · ${new Date().toISOString().slice(0, 10)}`,
  })
  if (error || !data) return { ok: false as const, error: error?.message ?? "Enroll failed" }

  return {
    ok: true as const,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  }
}

export async function finishMfaEnrollment(factorId: string, code: string) {
  if (!/^\d{6}$/.test(code.trim())) {
    return { ok: false as const, error: "Enter the 6-digit code from your app" }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function disableMfa(factorId: string, code: string) {
  if (!/^\d{6}$/.test(code.trim())) {
    return { ok: false as const, error: "Enter the 6-digit code to confirm" }
  }
  const supabase = await createClient()
  // Re-verify the code so an attacker with a temporary cookie can't strip
  // 2FA without proving knowledge of the authenticator.
  const verify = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  })
  if (verify.error) return { ok: false as const, error: verify.error.message }

  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

// Used by /login/mfa to satisfy the AAL2 step after password sign-in.
export async function verifyMfaForLogin(factorId: string, code: string) {
  if (!/^\d{6}$/.test(code.trim())) {
    return { ok: false as const, error: "Enter the 6-digit code from your app" }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: code.trim(),
  })
  if (error) return { ok: false as const, error: error.message }

  // Read the user from the verify response — `cookies()` would still see
  // the pre-verify session in this same server action, so we'd lose
  // userId on the auth-cookie path.
  const userId = data?.user?.id ?? (await getAuthUserIdFromCookie())
  if (!userId) redirect("/login")

  const admin = supabaseAdmin()
  const { data: profile } = await admin
    .from("profiles")
    .select("is_master")
    .eq("id", userId)
    .maybeSingle()
  if (profile?.is_master) redirect("/")

  const { data: mem } = await admin
    .from("workspace_memberships")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!mem?.workspace_id) redirect("/signup")

  const { data: ws } = await admin
    .from("workspaces")
    .select("slug")
    .eq("id", mem.workspace_id)
    .maybeSingle()
  if (ws?.slug) redirect(`/${ws.slug as string}`)
  redirect("/signup")
}

// ─── REVOKE INVITE ───
export async function revokeInvite(workspaceSlug: string, inviteId: string) {
  const user = await getCurrentUser(workspaceSlug)
  if (!user) return { error: "Not authenticated" }

  try {
    requirePermission(user, "people:invite")
  } catch (e) {
    if (e instanceof PermissionError) return { error: e.message }
    throw e
  }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("workspace_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("workspace_id", user.workspaceId)

  if (error) return { error: error.message }
  revalidatePath(`/${workspaceSlug}/settings/members`)
  return { success: true }
}
