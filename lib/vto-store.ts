"use client"

/**
 * Orage Core · V/TO (Vision/Traction Organizer) store
 *
 * Holds the editable strategic-backbone state. Auto-saves every 8s,
 * snapshots full state to a revision row on manual save, and powers
 * the inline "Ask AI" critique modal.
 *
 * Server actions in app/actions/vto.ts are the production write path.
 * This store is the optimistic client cache.
 */

import { create } from "zustand"

export type VTOTab = "vision" | "traction" | "threeYear" | "tenYear"

export type VTOSection =
  | "values"
  | "focus"
  | "tenyear"
  | "marketing"
  | "threeyear"
  | "oneyear"
  | "rocks"

export type CoreValue = {
  id: string
  name: string
  description: string
}

export type Goal = {
  id: string
  text: string
  rocksLinked: number
  status: "on_track" | "at_risk" | "off_track"
}

export type Measurable = {
  id: string
  label: string
  value: string
  meta: string
}

export type Milestone3Y = {
  id: string
  text: string
}

export type Unique = {
  id: string
  text: string
}

export type Revision = {
  id: string
  rev: number
  authorLabel: string
  at: string
  summary: string
  isCurrent?: boolean
}

export type AICritique = {
  open: boolean
  section: VTOSection | null
  current: string
  suggestion: string
  streaming: boolean
  prompt: string
}

type VTOState = {
  // Document meta
  rev: number
  lastEditedLabel: string
  lastEditedBy: string
  activeTab: VTOTab

  // Core Values
  coreValues: CoreValue[]

  // Core Focus
  purpose: string
  niche: string

  // 10-Year Target
  tenYearTarget: string

  // Marketing Strategy
  targetMarket: string
  uniques: Unique[]
  provenProcess: string
  guarantee: string

  // 3-Year Picture
  threeYearDate: string
  bigPicture: string
  threeYearMeasurables: Measurable[]
  threeYearMilestones: Milestone3Y[]

  // 1-Year Plan
  oneYearDate: string
  oneYearMeasurables: Measurable[]
  goals: Goal[]

  // Saving
  autosaveAt: number | null
  isSaving: boolean

  // Revisions
  revisions: Revision[]
  revisionsOpen: boolean

  // AI critique
  ai: AICritique

  // Actions
  setActiveTab: (tab: VTOTab) => void

  addCoreValue: () => void
  updateCoreValueName: (id: string, name: string) => void
  updateCoreValueDescription: (id: string, description: string) => void
  removeCoreValue: (id: string) => void
  reorderCoreValues: (orderedIds: string[]) => void

  setPurpose: (v: string) => void
  setNiche: (v: string) => void
  setTenYearTarget: (v: string) => void

  setTargetMarket: (v: string) => void
  updateUnique: (id: string, text: string) => void
  setProvenProcess: (v: string) => void
  setGuarantee: (v: string) => void

  setThreeYearDate: (v: string) => void
  setBigPicture: (v: string) => void
  updateThreeYearMeasurable: (id: string, value: string) => void
  updateThreeYearMilestone: (id: string, text: string) => void
  addThreeYearMilestone: () => void
  removeThreeYearMilestone: (id: string) => void

  setOneYearDate: (v: string) => void
  updateOneYearMeasurable: (id: string, value: string) => void
  updateGoal: (id: string, text: string) => void
  cycleGoalStatus: (id: string) => void
  addGoal: () => void
  removeGoal: (id: string) => void

  markDirty: () => void
  setIsSaving: (saving: boolean) => void

  saveRevision: (summary: string, authorLabel: string) => Revision
  restoreRevision: (revisionId: string) => void
  openRevisions: () => void
  closeRevisions: () => void

  openAI: (section: VTOSection, current: string) => void
  closeAI: () => void
  setAIPrompt: (prompt: string) => void
  regenerateAI: () => void
  acceptAI: () => string
}

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

// ---------- AI suggestion mock generator ----------------------------------
const SUGGESTIONS: Record<VTOSection, string[]> = {
  values: [
    "Default to action — a kept commitment beats a perfect plan. We move from idea to live in days, not quarters, and refactor once it's earning.",
    "Reputation compounds revenue — every shipped engagement is an audition for the next 5 referrals. We turn down work that won't make the case study.",
    "Compound the system — every note, handoff, and template is leverage for our future selves. Every project ships docs as well as code.",
    "Direct with care — say the hard thing fast, say it kindly, write it down. Comfort gets us fired in 18 months.",
    "Show the work — clients see the build, the team sees the why. Process is the product.",
  ],
  focus: [
    "We exist to make AI implementation feel inevitable — not optional, not experimental — for service businesses serious about building real leverage. Niche: US service businesses, $1M–$10M ARR, where the founder is the bottleneck.",
  ],
  tenyear: [
    "Become the operating system that 10,000 service businesses run on by 2036 — $250M ARR, profitable from year one, owned by the people who built it.",
  ],
  marketing: [
    "Three Uniques refined: (1) We build the agent + the surrounding system, not just the integration. (2) We use what we sell — Orage runs Orage. (3) 90-day proof-of-impact guarantee or we work for free until ROI lands.",
  ],
  threeyear: [
    "Orage is a 25-person team operating from CDMX HQ + remote at $12M ARR. Orage Core is a paid SaaS used by 800+ service businesses. Every client has a named AI Implementer. We turn down more work than we take. Founders are working ON the business 90% of the time.",
  ],
  oneyear: [
    "By April 2027: $1.2M ARR, 65% recurring (vs 40% today), Toolkit T1 publicly launched with $200K product MRR, senior AI Engineer + Marketing Lead hired and shipped, Quintessa case study live, OKC outbound delivering 12 closed-won, Boomer partnership at 153 active users.",
  ],
  rocks: [],
}

function randomFromSection(section: VTOSection): string {
  const list = SUGGESTIONS[section]
  if (!list || list.length === 0) return ""
  return list[Math.floor(Math.random() * list.length)]
}

function streamSuggestion(
  section: VTOSection,
  set: (
    fn: (state: VTOState) => Partial<VTOState> | VTOState,
  ) => void,
) {
  const full = randomFromSection(section)
  let i = 0
  set((s) => ({ ai: { ...s.ai, suggestion: "", streaming: true } }))
  const interval = setInterval(() => {
    i += 4 + Math.floor(Math.random() * 5)
    set((s) =>
      i < full.length
        ? { ai: { ...s.ai, suggestion: full.slice(0, i) } }
        : { ai: { ...s.ai, suggestion: full, streaming: false } },
    )
    if (i >= full.length) {
      clearInterval(interval)
    }
  }, 30)
}

// ---------- seed -----------------------------------------------------------
// Default Core Values for the demo tenant. Reset-to-Zero installs (e.g. a
// fresh `orage` workspace before onboarding finishes) override this from the
// onboarding wizard, but the V/TO panel is never blank on first load.
const SEED_VALUES: CoreValue[] = [
  {
    id: "cv_action",
    name: "DEFAULT TO ACTION",
    description:
      "A kept commitment beats a perfect plan — ship in days, refactor once it's earning.",
  },
  {
    id: "cv_reputation",
    name: "REPUTATION COMPOUNDS REVENUE",
    description:
      "Every shipped engagement is an audition for the next five referrals.",
  },
  {
    id: "cv_system",
    name: "COMPOUND THE SYSTEM",
    description:
      "Every note, handoff, and template is leverage for our future selves.",
  },
]

const SEED_UNIQUES: Unique[] = []

const SEED_3Y_MEASURABLES: Measurable[] = []

const SEED_3Y_MILESTONES: Milestone3Y[] = []

const SEED_1Y_MEASURABLES: Measurable[] = []

const SEED_GOALS: Goal[] = []

const SEED_REVISIONS: Revision[] = []

export const useVTOStore = create<VTOState>((set, get) => ({
  rev: 14,
  lastEditedLabel: "4 days ago",
  lastEditedBy: "George",
  activeTab: "vision",

  coreValues: [...SEED_VALUES],
  purpose:
    "To make AI implementation feel inevitable for any business that's serious about leverage.",
  niche:
    "Service businesses doing $1M-$10M ARR who need AI to defend margin, not chase trends. We build the agent layer + the operating system around it.",

  tenYearTarget:
    "Be the operating system that 10,000 service businesses run on by 2036 — $250M ARR, profitable from year 1.",

  targetMarket:
    'Service businesses, $1M–$10M ARR, US-based, owner-operated, in: legal, marketing, real estate, healthcare, professional services. Decision-maker: founder/CEO. Buying signal: hired AI consultant in last 18 months OR has internal "AI committee" but no shipping cadence.',
  uniques: [...SEED_UNIQUES],
  provenProcess:
    "DISCOVER → DESIGN → DEPLOY → DEFEND. Four phases, 90-day standard cycle, milestone gates each stage. Documented in /notes/proven-process.",
  guarantee:
    "If you don't see measurable ROI within 90 days of deployment, we keep building until you do — at no additional cost.",

  threeYearDate: "APR 2029",
  bigPicture:
    "Orage is a 25-person team operating from Mexico City + remote. $12M ARR. Orage Core is a paid SaaS used by 800+ service businesses. We've shipped 4 major Toolkit modules. Every client has a named AI Implementer. We've turned down more work than we've taken in the last 6 months.",
  threeYearMeasurables: [...SEED_3Y_MEASURABLES],
  threeYearMilestones: [...SEED_3Y_MILESTONES],

  oneYearDate: "April 30, 2027",
  oneYearMeasurables: [...SEED_1Y_MEASURABLES],
  goals: [...SEED_GOALS],

  autosaveAt: null,
  isSaving: false,

  revisions: [...SEED_REVISIONS],
  revisionsOpen: false,

  ai: {
    open: false,
    section: null,
    current: "",
    suggestion: "",
    streaming: false,
    prompt: "",
  },

  // ---------- actions ----------
  setActiveTab: (activeTab) => set({ activeTab }),

  addCoreValue: () =>
    set((s) =>
      s.coreValues.length >= 7
        ? s
        : {
            coreValues: [
              ...s.coreValues,
              {
                id: uid("cv"),
                name: "New core value",
                description: "Describe the behavior in one line.",
              },
            ],
          },
    ),
  updateCoreValueName: (id, name) =>
    set((s) => ({
      coreValues: s.coreValues.map((v) => (v.id === id ? { ...v, name } : v)),
    })),
  updateCoreValueDescription: (id, description) =>
    set((s) => ({
      coreValues: s.coreValues.map((v) =>
        v.id === id ? { ...v, description } : v,
      ),
    })),
  removeCoreValue: (id) =>
    set((s) => ({ coreValues: s.coreValues.filter((v) => v.id !== id) })),
  reorderCoreValues: (orderedIds) =>
    set((s) => {
      const map = new Map(s.coreValues.map((v) => [v.id, v]))
      const next = orderedIds
        .map((id) => map.get(id))
        .filter((v): v is CoreValue => Boolean(v))
      // Append any that weren't in the ordered list (defensive)
      for (const v of s.coreValues) {
        if (!orderedIds.includes(v.id)) next.push(v)
      }
      return { coreValues: next }
    }),

  setPurpose: (purpose) => set({ purpose }),
  setNiche: (niche) => set({ niche }),
  setTenYearTarget: (tenYearTarget) => set({ tenYearTarget }),

  setTargetMarket: (targetMarket) => set({ targetMarket }),
  updateUnique: (id, text) =>
    set((s) => ({
      uniques: s.uniques.map((u) => (u.id === id ? { ...u, text } : u)),
    })),
  setProvenProcess: (provenProcess) => set({ provenProcess }),
  setGuarantee: (guarantee) => set({ guarantee }),

  setThreeYearDate: (threeYearDate) => set({ threeYearDate }),
  setBigPicture: (bigPicture) => set({ bigPicture }),
  updateThreeYearMeasurable: (id, value) =>
    set((s) => ({
      threeYearMeasurables: s.threeYearMeasurables.map((m) =>
        m.id === id ? { ...m, value } : m,
      ),
    })),
  updateThreeYearMilestone: (id, text) =>
    set((s) => ({
      threeYearMilestones: s.threeYearMilestones.map((m) =>
        m.id === id ? { ...m, text } : m,
      ),
    })),
  addThreeYearMilestone: () =>
    set((s) => ({
      threeYearMilestones: [
        ...s.threeYearMilestones,
        { id: uid("ms"), text: "New milestone" },
      ],
    })),
  removeThreeYearMilestone: (id) =>
    set((s) => ({
      threeYearMilestones: s.threeYearMilestones.filter((m) => m.id !== id),
    })),

  setOneYearDate: (oneYearDate) => set({ oneYearDate }),
  updateOneYearMeasurable: (id, value) =>
    set((s) => ({
      oneYearMeasurables: s.oneYearMeasurables.map((m) =>
        m.id === id ? { ...m, value } : m,
      ),
    })),
  updateGoal: (id, text) =>
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, text } : g)),
    })),
  cycleGoalStatus: (id) =>
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id
          ? {
              ...g,
              status:
                g.status === "on_track"
                  ? "at_risk"
                  : g.status === "at_risk"
                    ? "off_track"
                    : "on_track",
            }
          : g,
      ),
    })),
  addGoal: () =>
    set((s) =>
      s.goals.length >= 7
        ? s
        : {
            goals: [
              ...s.goals,
              {
                id: uid("g"),
                text: "New goal",
                rocksLinked: 0,
                status: "on_track",
              },
            ],
          },
    ),
  removeGoal: (id) =>
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

  markDirty: () => set({ autosaveAt: Date.now() }),
  setIsSaving: (isSaving) => set({ isSaving }),

  saveRevision: (summary, authorLabel) => {
    const next: Revision = {
      id: uid("rev"),
      rev: get().rev + 1,
      authorLabel,
      at: new Date().toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      }).toUpperCase(),
      summary,
      isCurrent: true,
    }
    set((s) => ({
      rev: next.rev,
      revisions: [
        next,
        ...s.revisions.map((r) => ({ ...r, isCurrent: false })),
      ],
      lastEditedLabel: "just now",
      lastEditedBy: authorLabel,
    }))
    return next
  },
  restoreRevision: (revisionId) =>
    set((s) => ({
      revisions: s.revisions.map((r) => ({
        ...r,
        isCurrent: r.id === revisionId,
      })),
    })),
  openRevisions: () => set({ revisionsOpen: true }),
  closeRevisions: () => set({ revisionsOpen: false }),

  openAI: (section, current) => {
    set({
      ai: {
        open: true,
        section,
        current,
        suggestion: "",
        streaming: true,
        prompt: "",
      },
    })
    streamSuggestion(section, set)
  },
  closeAI: () =>
    set({
      ai: {
        open: false,
        section: null,
        current: "",
        suggestion: "",
        streaming: false,
        prompt: "",
      },
    }),
  setAIPrompt: (prompt) =>
    set((s) => ({ ai: { ...s.ai, prompt } })),
  regenerateAI: () => {
    const { ai } = get()
    if (!ai.section) return
    streamSuggestion(ai.section, set)
  },
  acceptAI: () => {
    const { ai } = get()
    const value = ai.suggestion
    set({
      ai: {
        open: false,
        section: null,
        current: "",
        suggestion: "",
        streaming: false,
        prompt: "",
      },
    })
    return value
  },
}))

// ---------- helpers --------------------------------------------------------
export function sectionLabel(section: VTOSection): string {
  switch (section) {
    case "values":
      return "CORE VALUES"
    case "focus":
      return "CORE FOCUS"
    case "tenyear":
      return "10-YEAR TARGET"
    case "marketing":
      return "MARKETING STRATEGY"
    case "threeyear":
      return "3-YEAR PICTURE"
    case "oneyear":
      return "1-YEAR PLAN"
    case "rocks":
      return "QUARTERLY ROCKS"
  }
}
