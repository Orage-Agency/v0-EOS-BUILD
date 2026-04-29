"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  ONBOARDING_STEPS,
  shouldShowOnboarding,
  useOnboardingStore,
  type OnboardingStepId,
} from "@/lib/onboarding-store"
import { useVTOStore } from "@/lib/vto-store"
import { useRocksStore } from "@/lib/rocks-store"
import { CURRENT_USER } from "@/lib/mock-data"
import { completeOnboarding } from "@/app/actions/onboarding"
import { cn } from "@/lib/utils"

const STEP_META: Record<
  OnboardingStepId,
  { num: number; eyebrow: string; title: string; subtitle: string }
> = {
  welcome: {
    num: 1,
    eyebrow: "STEP 01 · WELCOME",
    title: "MEET YOUR AI IMPLEMENTER",
    subtitle:
      "Orage Core runs the operating system for your business — vision, weekly rhythm, quarterly priorities, and an AI that watches everything for drift.",
  },
  values: {
    num: 2,
    eyebrow: "STEP 02 · CORE VALUES",
    title: "WHO YOU ARE",
    subtitle:
      "Pick 3-7 short rules of behavior. These show up in every hire, every fire, every quarterly review.",
  },
  focus: {
    num: 3,
    eyebrow: "STEP 03 · CORE FOCUS",
    title: "WHY YOU EXIST · WHAT YOU DO",
    subtitle:
      "Two sentences: the deeper purpose behind the work, and the specific thing you sell.",
  },
  tenyear: {
    num: 4,
    eyebrow: "STEP 04 · 10-YEAR TARGET",
    title: "THE BIG, HAIRY GOAL",
    subtitle:
      "One audacious target a decade out. Concrete. Numeric. Either you hit it or you don't.",
  },
  oneyear: {
    num: 5,
    eyebrow: "STEP 05 · 1-YEAR PLAN",
    title: "WHAT YOU SHIP THIS YEAR",
    subtitle:
      "3-7 outcomes that get you measurably closer to the 10-year target. One line each.",
  },
  rocks: {
    num: 6,
    eyebrow: "STEP 06 · QUARTERLY ROCKS",
    title: "WHAT YOU SHIP THIS QUARTER",
    subtitle:
      "Pick 3-7 priorities for the next 90 days. A rock is a finished outcome, not a task list.",
  },
  team: {
    num: 7,
    eyebrow: "STEP 07 · TEAM",
    title: "INVITE THE FOUNDING TEAM",
    subtitle:
      "Add the leadership team now or do it later from Settings → Members. They'll see the same VTO and join the L10 rhythm.",
  },
}

export function OnboardingWizard({
  workspaceSlug,
}: {
  workspaceSlug: string
}) {
  const visible = useOnboardingStore(shouldShowOnboarding)
  const stepIndex = useOnboardingStore((s) => s.stepIndex)
  const draft = useOnboardingStore((s) => s.draft)
  const next = useOnboardingStore((s) => s.next)
  const prev = useOnboardingStore((s) => s.prev)
  const goTo = useOnboardingStore((s) => s.goTo)
  const dismiss = useOnboardingStore((s) => s.dismiss)
  const finish = useOnboardingStore((s) => s.finish)
  const patch = useOnboardingStore((s) => s.patch)

  const setPurpose = useVTOStore((s) => s.setPurpose)
  const setNiche = useVTOStore((s) => s.setNiche)
  const setTenYearTarget = useVTOStore((s) => s.setTenYearTarget)
  const createRock = useRocksStore((s) => s.createRock)

  // ESC closes / tabs the user out — but only if we're past welcome (so the
  // first-ever screen isn't a quick-dismiss footgun).
  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && stepIndex > 0) {
        dismiss()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [visible, stepIndex, dismiss])

  if (!visible) return null

  const stepId = ONBOARDING_STEPS[stepIndex]
  const meta = STEP_META[stepId]
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1
  const isFirst = stepIndex === 0

  async function handleNext() {
    if (!isLast) {
      next()
      return
    }

    // Final commit: write captured answers into the live stores.
    if (draft.purpose) setPurpose(draft.purpose)
    if (draft.niche) setNiche(draft.niche)
    if (draft.tenYearTarget) setTenYearTarget(draft.tenYearTarget)

    const validRocks = draft.rocks.filter((r) => r.title.trim().length > 0)
    const due = isoDateInDays(90)
    for (const r of validRocks) {
      createRock({
        title: r.title.trim(),
        outcome: r.outcome.trim() || r.title.trim(),
        owner: CURRENT_USER.id,
        due,
        tag: "Q1",
      })
    }

    // Stamp `workspaces.onboarding_completed_at` so the auth gate stops
    // showing this wizard on subsequent loads.
    try {
      await completeOnboarding(workspaceSlug)
    } catch (err) {
      console.error("[v0] completeOnboarding failed:", err)
      toast("COULDN'T SAVE ONBOARDING — TRY AGAIN")
      return
    }

    finish()
    toast("ONBOARDING COMPLETE · WELCOME ABOARD")
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-[120] flex items-center justify-center bg-bg-1/95 backdrop-blur-md p-4 md:p-8"
    >
      {/* Subtle grid + glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--gold-500) 1px, transparent 1px), linear-gradient(to bottom, var(--gold-500) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-3xl flex flex-col bg-bg-2 border border-border-orage rounded-md shadow-[0_20px_60px_rgba(0,0,0,0.5)] max-h-full overflow-hidden">
        {/* Header */}
        <header className="px-7 pt-6 pb-4 border-b border-border-orage flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-300">
              ◆ {meta.eyebrow}
            </span>
            <h2
              id="onboarding-title"
              className="font-mono uppercase tracking-tight text-text-primary text-2xl md:text-3xl mt-2"
            >
              {meta.title}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed mt-2 max-w-2xl">
              {meta.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted hover:text-gold-300 transition-colors"
          >
            Skip setup →
          </button>
        </header>

        {/* Progress ticker */}
        <ProgressBar stepIndex={stepIndex} onJump={goTo} />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <StepBody stepId={stepId} draft={draft} patch={patch} />
        </div>

        {/* Footer */}
        <footer className="px-7 py-4 border-t border-border-orage flex items-center justify-between gap-4 bg-bg-3/40">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
            Step {meta.num} / {ONBOARDING_STEPS.length}
          </span>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={prev}
                className="px-4 py-2 rounded-sm border border-border-orage hover:border-gold-500 hover:text-gold-300 text-text-primary text-xs font-mono uppercase tracking-[0.16em] transition-colors"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-sm bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-mono uppercase tracking-[0.16em] font-semibold transition-colors"
            >
              {isLast ? "Finish · Enter Orage" : "Continue"} →
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Progress bar                                                                */
/* -------------------------------------------------------------------------- */

function ProgressBar({
  stepIndex,
  onJump,
}: {
  stepIndex: number
  onJump: (i: number) => void
}) {
  return (
    <div className="px-7 py-3 flex items-center gap-2 border-b border-border-orage bg-bg-1/60">
      {ONBOARDING_STEPS.map((id, i) => {
        const done = i < stepIndex
        const active = i === stepIndex
        return (
          <button
            key={id}
            type="button"
            onClick={() => (i <= stepIndex ? onJump(i) : null)}
            disabled={i > stepIndex}
            className={cn(
              "flex-1 h-1 rounded-pill transition-colors",
              done && "bg-gold-500 hover:bg-gold-400 cursor-pointer",
              active && "bg-gold-300",
              !done && !active && "bg-border-orage cursor-not-allowed",
            )}
            aria-label={`Step ${i + 1} · ${id}`}
          />
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Step bodies                                                                 */
/* -------------------------------------------------------------------------- */

function StepBody({
  stepId,
  draft,
  patch,
}: {
  stepId: OnboardingStepId
  draft: ReturnType<typeof useOnboardingStore.getState>["draft"]
  patch: ReturnType<typeof useOnboardingStore.getState>["patch"]
}) {
  switch (stepId) {
    case "welcome":
      return <WelcomeStep draft={draft} patch={patch} />
    case "values":
      return <CoreValuesStep draft={draft} patch={patch} />
    case "focus":
      return <FocusStep draft={draft} patch={patch} />
    case "tenyear":
      return <TenYearStep draft={draft} patch={patch} />
    case "oneyear":
      return <OneYearStep draft={draft} patch={patch} />
    case "rocks":
      return <RocksStep draft={draft} patch={patch} />
    case "team":
      return <TeamStep draft={draft} patch={patch} />
    default:
      return null
  }
}

type StepProps = {
  draft: ReturnType<typeof useOnboardingStore.getState>["draft"]
  patch: ReturnType<typeof useOnboardingStore.getState>["patch"]
}

function WelcomeStep({ draft, patch }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { k: "VISION", v: "VTO + 10-year target + 3-year picture" },
          { k: "RHYTHM", v: "Weekly L10 + quarterly review" },
          { k: "EXECUTION", v: "Rocks · Tasks · Issues · Scorecard" },
          { k: "AI", v: "Implementer surfaces drift before it costs you" },
        ].map((p) => (
          <li
            key={p.k}
            className="rounded-sm border border-border-orage bg-bg-3 px-4 py-3"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300">
              ◆ {p.k}
            </span>
            <p className="text-sm text-text-secondary leading-relaxed mt-1">
              {p.v}
            </p>
          </li>
        ))}
      </ul>

      <Field
        label="Company name"
        hint="Used in headers, exports, and AI prompts."
      >
        <input
          value={draft.companyName}
          onChange={(e) => patch({ companyName: e.target.value })}
          placeholder="e.g. Orage Agency LLC"
          className="w-full rounded-sm border border-border-orage bg-bg-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 transition-colors"
        />
      </Field>
    </div>
  )
}

function CoreValuesStep({ draft, patch }: StepProps) {
  function update(i: number, value: string) {
    const next = [...draft.coreValues]
    next[i] = value
    patch({ coreValues: next })
  }
  function addValue() {
    if (draft.coreValues.length >= 7) return
    patch({ coreValues: [...draft.coreValues, ""] })
  }
  function removeValue(i: number) {
    if (draft.coreValues.length <= 3) return
    patch({ coreValues: draft.coreValues.filter((_, idx) => idx !== i) })
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted font-mono uppercase tracking-[0.16em]">
        Examples · &quot;Bias to build&quot; · &quot;Show the work&quot; · &quot;Direct with care&quot;
      </p>
      <ul className="flex flex-col gap-2">
        {draft.coreValues.map((v, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-sm border border-border-orage bg-bg-3 px-3 py-2"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300 w-6">
              0{i + 1}
            </span>
            <input
              value={v}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Value ${i + 1}`}
              className="flex-1 border-none bg-transparent px-0 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
            {draft.coreValues.length > 3 && (
              <button
                type="button"
                onClick={() => removeValue(i)}
                className="text-text-muted hover:text-danger text-xs font-mono"
                aria-label={`Remove value ${i + 1}`}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
      {draft.coreValues.length < 7 && (
        <button
          type="button"
          onClick={addValue}
          className="self-start text-xs font-mono uppercase tracking-[0.16em] text-text-muted hover:text-gold-300 transition-colors"
        >
          + Add value
        </button>
      )}
    </div>
  )
}

function FocusStep({ draft, patch }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Purpose / cause / passion"
        hint="The deeper why. Not what you sell — why you're in business."
      >
        <textarea
          value={draft.purpose}
          onChange={(e) => patch({ purpose: e.target.value })}
          rows={3}
          placeholder="To give every founder the operating system the best ones build for themselves."
          className="w-full rounded-sm border border-border-orage bg-bg-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 resize-none transition-colors"
        />
      </Field>
      <Field
        label="Niche"
        hint="The specific thing you do better than anyone else."
      >
        <textarea
          value={draft.niche}
          onChange={(e) => patch({ niche: e.target.value })}
          rows={2}
          placeholder="Founder-led agencies running EOS / Rockefeller habits."
          className="w-full rounded-sm border border-border-orage bg-bg-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 resize-none transition-colors"
        />
      </Field>
    </div>
  )
}

function TenYearStep({ draft, patch }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <Field
        label="10-year target"
        hint="One sentence. Numeric. Concrete. Either you hit it or you don't."
      >
        <textarea
          value={draft.tenYearTarget}
          onChange={(e) => patch({ tenYearTarget: e.target.value })}
          rows={4}
          placeholder="$100M ARR by 2036 · 10,000 founder-led companies on Orage Core."
          className="w-full rounded-sm border border-border-orage bg-bg-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 resize-none transition-colors"
        />
      </Field>
      <Aside title="Examples">
        <li>$50M revenue by 2034</li>
        <li>1,000 paying customers · NPS &gt; 60</li>
        <li>Profitable in every quarter for 5 years straight</li>
      </Aside>
    </div>
  )
}

function OneYearStep({ draft, patch }: StepProps) {
  function update(i: number, value: string) {
    const next = [...draft.oneYearGoals]
    next[i] = value
    patch({ oneYearGoals: next })
  }
  function addGoal() {
    if (draft.oneYearGoals.length >= 7) return
    patch({ oneYearGoals: [...draft.oneYearGoals, ""] })
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted font-mono uppercase tracking-[0.16em]">
        One outcome per line · finished by 12 months from today
      </p>
      <ul className="flex flex-col gap-2">
        {draft.oneYearGoals.map((g, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-sm border border-border-orage bg-bg-3 px-3 py-2"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300 w-6">
              0{i + 1}
            </span>
            <input
              value={g}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Goal ${i + 1}`}
              className="flex-1 border-none bg-transparent px-0 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </li>
        ))}
      </ul>
      {draft.oneYearGoals.length < 7 && (
        <button
          type="button"
          onClick={addGoal}
          className="self-start text-xs font-mono uppercase tracking-[0.16em] text-text-muted hover:text-gold-300 transition-colors"
        >
          + Add goal
        </button>
      )}
    </div>
  )
}

function RocksStep({ draft, patch }: StepProps) {
  function update(i: number, key: "title" | "outcome", value: string) {
    const next = draft.rocks.map((r, idx) =>
      idx === i ? { ...r, [key]: value } : r,
    )
    patch({ rocks: next })
  }
  function addRock() {
    if (draft.rocks.length >= 7) return
    patch({ rocks: [...draft.rocks, { title: "", outcome: "" }] })
  }
  function removeRock(i: number) {
    if (draft.rocks.length <= 1) return
    patch({ rocks: draft.rocks.filter((_, idx) => idx !== i) })
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted font-mono uppercase tracking-[0.16em]">
        First quarterly rocks · 90-day outcomes · owner = you (reassign later)
      </p>
      <ul className="flex flex-col gap-3">
        {draft.rocks.map((r, i) => (
          <li
            key={i}
            className="rounded-sm border border-border-orage bg-bg-3 px-4 py-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300">
                ◆ ROCK 0{i + 1}
              </span>
              {draft.rocks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRock(i)}
                  className="text-text-muted hover:text-danger text-xs font-mono"
                  aria-label={`Remove rock ${i + 1}`}
                >
                  ✕
                </button>
              )}
            </div>
            <input
              value={r.title}
              onChange={(e) => update(i, "title", e.target.value)}
              placeholder="Title — one outcome"
              className="w-full mb-2 rounded-sm border border-border-orage bg-bg-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 transition-colors"
            />
            <textarea
              value={r.outcome}
              onChange={(e) => update(i, "outcome", e.target.value)}
              rows={2}
              placeholder="What's true on day 90 that isn't true today?"
              className="w-full rounded-sm border border-border-orage bg-bg-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 resize-none transition-colors"
            />
          </li>
        ))}
      </ul>
      {draft.rocks.length < 7 && (
        <button
          type="button"
          onClick={addRock}
          className="self-start text-xs font-mono uppercase tracking-[0.16em] text-text-muted hover:text-gold-300 transition-colors"
        >
          + Add rock
        </button>
      )}
    </div>
  )
}

function TeamStep({ draft, patch }: StepProps) {
  const [draftEmail, setDraftEmail] = useState("")
  const isValid = useMemo(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draftEmail), [draftEmail])

  function add() {
    if (!isValid) return
    if (draft.invitedEmails.includes(draftEmail)) return
    patch({ invitedEmails: [...draft.invitedEmails, draftEmail] })
    setDraftEmail("")
  }
  function remove(email: string) {
    patch({ invitedEmails: draft.invitedEmails.filter((e) => e !== email) })
  }

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Invite teammates"
        hint="They land in Settings → Members as pending invites — no email sent until you flip the switch."
      >
        <div className="flex gap-2">
          <input
            value={draftEmail}
            onChange={(e) => setDraftEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                add()
              }
            }}
            placeholder="founder@yourco.com"
            type="email"
            className="flex-1 rounded-sm border border-border-orage bg-bg-3 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-gold-500 transition-colors"
          />
          <button
            type="button"
            onClick={add}
            disabled={!isValid}
            className={cn(
              "px-4 rounded-sm font-mono text-xs uppercase tracking-[0.16em] transition-colors",
              isValid
                ? "bg-gold-500 hover:bg-gold-400 text-text-on-gold"
                : "bg-bg-3 text-text-muted cursor-not-allowed",
            )}
          >
            Add
          </button>
        </div>
      </Field>

      {draft.invitedEmails.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {draft.invitedEmails.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between rounded-sm border border-border-orage bg-bg-3 px-3 py-2 text-sm text-text-primary"
            >
              <span className="truncate">{email}</span>
              <button
                type="button"
                onClick={() => remove(email)}
                className="text-text-muted hover:text-danger text-xs font-mono"
                aria-label={`Remove ${email}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-text-muted font-mono uppercase tracking-[0.16em]">
          Skip if it&apos;s just you for now — invite from settings whenever.
        </p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gold-300">
        ◆ {label}
      </span>
      {hint ? (
        <span className="text-xs text-text-muted leading-relaxed">{hint}</span>
      ) : null}
      {children}
    </label>
  )
}

function Aside({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-sm border border-border-orage bg-bg-3/60 px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-muted">
        {title}
      </span>
      <ul className="flex flex-col gap-1.5 mt-2 text-sm text-text-secondary">
        {children}
      </ul>
    </div>
  )
}

function isoDateInDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
