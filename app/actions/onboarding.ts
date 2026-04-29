"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Marks the *signed-in user's* onboarding as complete by stamping
 * `profiles.onboarding_completed_at = now()`.
 *
 * Per `01-auth-schema-llYXw.sql` the onboarding flag lives on the user
 * profile (per-user, not per-workspace), so the wizard fires the first
 * time George — or any new invitee — lands in a workspace.
 *
 * The `update_own_profile` RLS policy on `profiles` already restricts
 * the update to the caller's own row (`id = auth.uid()`), so we use the
 * standard SSR client and let RLS scope it.
 */
export async function completeOnboarding(workspaceSlug: string): Promise<{
  ok: true
  completedAt: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/${workspaceSlug}/login`)

  const now = new Date().toISOString()
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: now })
    .eq("id", user.id)

  if (error) {
    throw new Error(`Failed to mark onboarding complete: ${error.message}`)
  }

  // Re-render the workspace shell so the OnboardingGate re-reads the new
  // `onboarding_completed_at` value and stops showing the wizard.
  revalidatePath(`/${workspaceSlug}`, "layout")
  return { ok: true, completedAt: now }
}
