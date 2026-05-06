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
        set((s) => {
          const next = { ...s.draft, ...patch }
          // Fire-and-forget DB persistence (debounced via the helper
          // below). Server action lives in app/actions/onboarding.ts.
          schedulePersist(next)
          return { draft: next }
        }),
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

// ─── DB-backed draft persistence ─────────────────────────────
// Zustand `persist` keeps the draft in localStorage so a refresh in the
// same browser resumes the wizard. But if the user signs in from another
// device — or clears site data mid-flow — they'd start over. The server
// action below lifts the draft to `profiles.onboarding_draft` so the
// wizard genuinely picks up where the user left off.
//
// We debounce the writes so a fast-typing user doesn't hammer the DB
// with one upsert per keystroke.

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(draft: OnboardingDraft) {
  if (typeof window === "undefined") return
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    void persistDraftNow(draft)
  }, 800)
}

async function persistDraftNow(draft: OnboardingDraft) {
  try {
    const { saveOnboardingDraft } = await import(
      "@/app/actions/onboarding"
    )
    await saveOnboardingDraft(draft as unknown as Record<string, unknown>)
  } catch {
    // Persistence is best-effort — local state remains the source of
    // truth for the active session, so a transient network failure
    // doesn't surface to the user.
  }
}

/**
 * Load any saved draft from the server and merge it into the store.
 * Called by OnboardingGate on mount when the wizard first appears.
 */
export async function hydrateOnboardingDraft(): Promise<void> {
  if (typeof window === "undefined") return
  try {
    const { loadOnboardingDraft } = await import(
      "@/app/actions/onboarding"
    )
    const remote = await loadOnboardingDraft()
    if (!remote) return
    const state = useOnboardingStore.getState()
    // Only hydrate when the local draft is still pristine — otherwise
    // we'd clobber what the user is actively typing.
    const isPristine =
      state.draft.companyName === "" &&
      state.draft.purpose === "" &&
      state.draft.tenYearTarget === "" &&
      state.draft.oneYearGoals.every((g) => g === "") &&
      state.draft.rocks.every((r) => r.title === "" && r.outcome === "")
    if (!isPristine) return
    useOnboardingStore.setState({
      draft: { ...state.draft, ...(remote as Partial<OnboardingDraft>) },
    })
  } catch {
    /* best-effort hydration */
  }
}
