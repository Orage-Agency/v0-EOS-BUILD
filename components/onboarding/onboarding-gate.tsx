"use client"

import { useEffect, useState } from "react"

import { OnboardingWizard } from "./onboarding-wizard"
import { useOnboardingStore } from "@/lib/onboarding-store"

/**
 * Auth-aware gate for the onboarding wizard.
 *
 * Triggers on the FIRST authenticated render where the workspace has
 * `onboarding_completed_at = NULL`. The server-rendered layout passes
 * `onboardingCompleted` based on that column; we forward it into the
 * persisted client store so a re-run from Settings or the user's manual
 * "skip" still wins on subsequent renders.
 *
 * The wizard's store is `persist`-backed, so we wait one tick to let zustand
 * hydrate from localStorage before deciding what to render — otherwise the
 * SSR'd HTML and the post-hydration HTML disagree.
 */
export function OnboardingGate({
  workspaceSlug,
  onboardingCompleted,
}: {
  workspaceSlug: string
  onboardingCompleted: boolean
}) {
  const [hydrated, setHydrated] = useState(false)
  const setComplete = useOnboardingStore((s) => s.finish)
  const reopen = useOnboardingStore((s) => s.reopen)
  const localComplete = useOnboardingStore((s) => s.complete)
  const dismissed = useOnboardingStore((s) => s.dismissed)

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Reconcile the persisted client flag with the server's source of truth.
  // - DB says complete → flip the store to complete (idempotent).
  // - DB says NOT complete AND user hasn't dismissed → reopen the wizard.
  useEffect(() => {
    if (!hydrated) return
    if (onboardingCompleted && !localComplete) {
      setComplete()
      return
    }
    if (!onboardingCompleted && !localComplete && !dismissed) {
      reopen()
    }
  }, [hydrated, onboardingCompleted, localComplete, dismissed, setComplete, reopen])

  if (!hydrated) return null
  return <OnboardingWizard workspaceSlug={workspaceSlug} />
}
