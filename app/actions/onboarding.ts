"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getAuthUserIdFromCookie } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

/**
 * Marks the *signed-in user's* onboarding as complete by stamping
 * `profiles.onboarding_completed_at = now()`.
 *
 * Per `01-auth-schema-llYXw.sql` the onboarding flag lives on the user
 * profile (per-user, not per-workspace), so the wizard fires the first
 * time George — or any new invitee — lands in a workspace.
 *
 * Uses the verified-cookie identity (lib/auth.ts) instead of
 * supabase.auth.getUser() because @supabase/ssr 0.10.2 + ES256 JWTs
 * returns null in this codebase, which would bounce a freshly-signed-up
 * user back to /login on the very first "Finish" click.
 */
export async function completeOnboarding(workspaceSlug: string): Promise<{
  ok: true
  completedAt: string
}> {
  const userId = await getAuthUserIdFromCookie()
  if (!userId) redirect(`/${workspaceSlug}/login`)

  const now = new Date().toISOString()
  const admin = supabaseAdmin()
  const { error } = await admin
    .from("profiles")
    .update({ onboarding_completed_at: now })
    .eq("id", userId)

  if (error) {
    throw new Error(`Failed to mark onboarding complete: ${error.message}`)
  }

  // Re-render the workspace shell so the OnboardingGate re-reads the new
  // `onboarding_completed_at` value and stops showing the wizard.
  revalidatePath(`/${workspaceSlug}`, "layout")
  return { ok: true, completedAt: now }
}

/**
 * Persist the in-progress wizard draft to `profiles.onboarding_draft` so
 * a refresh between steps resumes where the user left off. The wizard
 * calls this debounced (every patch + on step change) — never hot path.
 */
export async function saveOnboardingDraft(
  draft: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const userId = await getAuthUserIdFromCookie()
  if (!userId) return { ok: false, error: "Not signed in" }

  const admin = supabaseAdmin()
  const { error } = await admin
    .from("profiles")
    .update({ onboarding_draft: draft })
    .eq("id", userId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * Read the saved wizard draft so the Zustand store can hydrate from DB
 * on first mount. Returns null when the column is empty or the user has
 * already finished onboarding (we don't keep stale drafts around).
 */
export async function loadOnboardingDraft(): Promise<Record<string, unknown> | null> {
  const userId = await getAuthUserIdFromCookie()
  if (!userId) return null

  const admin = supabaseAdmin()
  const { data } = await admin
    .from("profiles")
    .select("onboarding_draft, onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle()

  if (!data) return null
  if (data.onboarding_completed_at) return null
  return (data.onboarding_draft as Record<string, unknown> | null) ?? null
}
