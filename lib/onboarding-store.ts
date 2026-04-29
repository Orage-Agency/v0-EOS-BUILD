"use client"

/**
 * First-login onboarding state.
 *
 * Persisted with zustand `persist` so the wizard never re-prompts a master
 * who has already finished or explicitly dismissed it. When auth + DB land,
 * `complete`/`dismissed`/`completedAt` move to a `tenant_onboarding` row.
 */

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

export const ONBOARDING_STEPS = [
  "welcome",
  "values",
  "focus",
  "tenyear",
  "oneyear",
  "rocks",
  "team",
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]

export type OnboardingDraft = {
  companyName: string
  coreValues: string[]
  purpose: string
  niche: string
  tenYearTarget: string
  oneYearGoals: string[]
  rocks: { title: string; outcome: string }[]
  invitedEmails: string[]
}

const emptyDraft: OnboardingDraft = {
  companyName: "",
  coreValues: ["", "", ""],
  purpose: "",
  niche: "",
  tenYearTarget: "",
  oneYearGoals: ["", "", ""],
  rocks: [
    { title: "", outcome: "" },
    { title: "", outcome: "" },
    { title: "", outcome: "" },
  ],
  invitedEmails: [],
}

type OnboardingState = {
  /** True until the user finishes step 7. */
  open: boolean
  /** True if the user explicitly skipped the whole flow. */
  dismissed: boolean
  /** True after a successful submit. */
  complete: boolean
  /** Epoch ms of completion. */
  completedAt?: number
  /** Current step index (0-6). */
  stepIndex: number
  /** Captured form data — survives between step navigation. */
  draft: OnboardingDraft

  // ---- actions ----
  start: () => void
  next: () => void
  prev: () => void
  goTo: (step: number) => void
  dismiss: () => void
  reopen: () => void
  resetDraft: () => void
  finish: () => void
  patch: (patch: Partial<OnboardingDraft>) => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      open: true,
      dismissed: false,
      complete: false,
      stepIndex: 0,
      draft: emptyDraft,

      start: () => set({ open: true, dismissed: false }),
      next: () =>
        set((s) => ({
          stepIndex: Math.min(s.stepIndex + 1, ONBOARDING_STEPS.length - 1),
        })),
      prev: () =>
        set((s) => ({ stepIndex: Math.max(s.stepIndex - 1, 0) })),
      goTo: (step) =>
        set(() => ({
          stepIndex: Math.max(0, Math.min(step, ONBOARDING_STEPS.length - 1)),
        })),
      dismiss: () => set({ dismissed: true, open: false }),
      reopen: () => set({ open: true, dismissed: false, stepIndex: 0 }),
      resetDraft: () => set({ draft: emptyDraft, stepIndex: 0 }),
      finish: () =>
        set({
          complete: true,
          open: false,
          completedAt: Date.now(),
        }),
      patch: (patch) =>
        set((s) => ({ draft: { ...s.draft, ...patch } })),
    }),
    {
      name: "orage:onboarding:v1",
      storage: createJSONStorage(() => localStorage),
      // Only persist what we need; skip transient UI flags.
      partialize: (s) => ({
        dismissed: s.dismissed,
        complete: s.complete,
        completedAt: s.completedAt,
        stepIndex: s.stepIndex,
        draft: s.draft,
        open: s.open,
      }),
    },
  ),
)

/** Convenience selector — true when the wizard should be visible right now. */
export function shouldShowOnboarding(s: OnboardingState): boolean {
  return s.open && !s.complete && !s.dismissed
}
