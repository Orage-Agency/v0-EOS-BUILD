"use client"

import { useEffect, useState } from "react"

import { OnboardingWizard } from "./onboarding-wizard"
import { hydrateOnboardingDraft, useOnboardingStore } from "@/lib/onboarding-store"

/**
 * Auth-aware gate for the onboarding wizard.
 *
 * Three suppression flags drive whether the wizard mounts. Any one of
 * them being true keeps the wizard closed:
 *
 *   • onboardingCompleted — per-USER flag (profiles.onboarding_completed_at).
 *     Set when this specific user finished or skipped the wizard.
 *
 *   • workspaceAlreadySetup — per-WORKSPACE flag derived from
 *     workspaces.vto_data. True when ANYONE has filled out the V/TO.
 *     Prevents a founder skipping the wizard from inadvertently
 *     showing it to teammates later.
 *
 *   • !isWorkspaceCreator — per-MEMBERSHIP flag. Only founder / owner /
 *     master roles see the V/TO setup flow. Invited members
 *     (admin / leader / member / viewer) NEVER see it, full stop.
 *     This is the load-bearing one: the wizard's whole job is to
 *     capture the workspace's vision; non-creators have nothing to
 *     contribute there.
 *
 * The wizard renders only when ALL three say "fresh" — which is exactly
 * the moment a brand-new founder logs in for the first time on a brand-
 * new workspace.
 *
 * The wizard's store is `persist`-backed, so we wait one tick to let
 * zustand hydrate from localStorage before deciding what to render —
 * otherwise SSR and post-hydration HTML disagree.
 */
export function OnboardingGate({
  workspaceSlug,
  onboardingCompleted,
  workspaceAlreadySetup,
  isWorkspaceCreator,
}: {
  workspaceSlug: string
  onboardingCompleted: boolean
  workspaceAlreadySetup: boolean
  isWorkspaceCreator: boolean
}) {
  const [hydrated, setHydrated] = useState(false)
  const setComplete = useOnboardingStore((s) => s.finish)
  const reopen = useOnboardingStore((s) => s.reopen)
  const localComplete = useOnboardingStore((s) => s.complete)
  const dismissed = useOnboardingStore((s) => s.dismissed)

  // Any one wins → wizard stays closed for this user.
  const suppressed =
    onboardingCompleted || workspaceAlreadySetup || !isWorkspaceCreator

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
