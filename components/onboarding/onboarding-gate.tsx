"use client"

import { useEffect, useState } from "react"

import { OnboardingWizard } from "./onboarding-wizard"
import { hydrateOnboardingDraft, useOnboardingStore } from "@/lib/onboarding-store"

/**
 * Auth-aware gate for the onboarding wizard.
 *
 * Two suppression flags drive whether the wizard mounts:
 *
 *   • onboardingCompleted — per-USER flag (profiles.onboarding_completed_at).
 *     Set when this specific user finished or skipped the wizard.
 *
 *   • workspaceAlreadySetup — per-WORKSPACE flag derived from
 *     workspaces.vto_data. True when ANYONE has filled out the V/TO
 *     (purpose, niche, ten-year target, core values, or rocks) for this
 *     workspace. This is the bug fix: an invited team member who joins
 *     a workspace that's already configured should NEVER see the founder's
 *     setup wizard, regardless of their personal onboarding flag.
 *
 * Either flag being true suppresses the wizard. The wizard only renders
 * when BOTH are false — i.e., the user is the first one in a fresh
 * workspace, which is exactly the founder's first-login moment.
 *
 * The wizard's store is `persist`-backed, so we wait one tick to let
 * zustand hydrate from localStorage before deciding what to render —
 * otherwise SSR and post-hydration HTML disagree.
 */
export function OnboardingGate({
  workspaceSlug,
  onboardingCompleted,
  workspaceAlreadySetup,
}: {
  workspaceSlug: string
  onboardingCompleted: boolean
  workspaceAlreadySetup: boolean
}) {
  const [hydrated, setHydrated] = useState(false)
  const setComplete = useOnboardingStore((s) => s.finish)
  const reopen = useOnboardingStore((s) => s.reopen)
  const localComplete = useOnboardingStore((s) => s.complete)
  const dismissed = useOnboardingStore((s) => s.dismissed)

  // Either flag wins → wizard stays closed for this user.
  const suppressed = onboardingCompleted || workspaceAlreadySetup

  useEffect(() => {
    setHydrated(true)
    if (!suppressed) {
      // Pull any saved server-side draft so a fresh device picks up
      // wherever the user paused. Best-effort; no-op when local store
      // already has user input.
      void hydrateOnboardingDraft()
    }
  }, [suppressed])

  // Reconcile the persisted client flag with the server's source of truth.
  // - Either flag says we should skip → flip the store to complete.
  // - Both say NOT complete AND user hasn't dismissed → reopen.
  useEffect(() => {
    if (!hydrated) return
    if (suppressed && !localComplete) {
      setComplete()
      return
    }
    if (!suppressed && !localComplete && !dismissed) {
      reopen()
    }
  }, [hydrated, suppressed, localComplete, dismissed, setComplete, reopen])

  if (!hydrated) return null
  if (suppressed) return null
  return <OnboardingWizard workspaceSlug={workspaceSlug} />
}
