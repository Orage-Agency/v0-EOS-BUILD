/**
 * Orage Core · Issues seed data (plain module, server- and client-safe).
 *
 * Extracted from lib/issues-store.ts so server-only modules
 * (lib/dashboard.ts, lib/ai/tools.ts) can read the same dataset
 * the client store seeds from. Single source of truth for the
 * 8 demo issues until Supabase issues are seeded.
 */

export type IssueSeverity = "critical" | "high" | "normal" | "low"
export type IssueStage = "identify" | "discuss" | "solve"
export type IssueSource = "user" | "ai" | "scorecard" | "l10"
export type IssueQueue = "open" | "this_week" | "solved" | "tabled"
export type ResolvePath =
  | "rock"
  | "task"
  | "decision"
  | "headline"
  | "archive"

export type IssueResolution = {
  path: ResolvePath
  payload: Record<string, unknown>
  resolvedBy: string
  resolvedAt: string
  reason?: string
}

export type IssueActivity = {
  id: string
  authorLabel: string
  at: string
  body: string
}

export type Issue = {
  id: string
  title: string
  context: string
  severity: IssueSeverity
  stage: IssueStage
  source: IssueSource
  sourceLabel: string
  ownerId: string
  /** ISO date string of creation. Used to compute age. */
  createdAt: string
  ageLabel: string
  rank: number
  queue: IssueQueue
  pinnedForL10: boolean
  linkedRockId?: string
  linkedMetricId?: string
  patternHint?: string
  resolution?: IssueResolution
  activity: IssueActivity[]
}

export type AISuggestion = {
  id: string
  title: string
  context: string
  severity: IssueSeverity
  reason: string
  dismissed: boolean
}

export const SEED_ISSUES: Issue[] = [
  // ── Open queue ──────────────────────────────────────────────
  {
    id: "i_seed_1",
    title: "No clear weekly scorecard rhythm established yet",
    context:
      "Team lacks a consistent cadence for updating scorecard metrics each Monday. Several weeks have nulls in Discovery Calls and Velocity rows. Needs an owner and a process.",
    severity: "normal",
    stage: "identify",
    source: "user",
    sourceLabel: "GEORGE · DROP",
    ownerId: "u_geo",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ageLabel: "2D",
    rank: 1,
    queue: "open",
    pinnedForL10: false,
    activity: [
      {
        id: "a_seed_1_0",
        authorLabel: "GEORGE · NOW",
        at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Issue dropped.",
      },
    ],
  },
  {
    id: "i_seed_2",
    title: "Discovery calls at 3/wk vs 8 target — two consecutive reds",
    context:
      "Outbound velocity dropped 22% over two weeks. Ivy's discovery call pipeline is behind: 3 calls booked vs 8/week target. Root cause unclear — may be ICP mismatch or capacity issue.",
    severity: "high",
    stage: "identify",
    source: "scorecard",
    sourceLabel: "SCORECARD AUTO",
    ownerId: "u_ivy",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    ageLabel: "1D",
    rank: 2,
    queue: "open",
    pinnedForL10: false,
    linkedMetricId: "m_disco",
    patternHint: "2 consecutive reds on Discovery Calls",
    activity: [
      {
        id: "a_seed_2_0",
        authorLabel: "SCORECARD AUTO · NOW",
        at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Auto-flagged: Discovery Calls red two weeks running. Target 8, actual 4 then 3.",
      },
    ],
  },
  {
    id: "i_seed_3",
    title: "Ivy's 1:1 is 18 days overdue — no Quarterly Conversation scheduled",
    context:
      "Ivy Campos has not had a 1:1 in 18 days and a Quarterly Conversation has not been scheduled. People health indicator is showing red. Per EOS, weekly 1:1s are non-negotiable for seat accountability.",
    severity: "normal",
    stage: "identify",
    source: "ai",
    sourceLabel: "AI IMPLEMENTER",
    ownerId: "u_geo",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    ageLabel: "3D",
    rank: 3,
    queue: "open",
    pinnedForL10: false,
    activity: [
      {
        id: "a_seed_3_0",
        authorLabel: "AI IMPLEMENTER · NOW",
        at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Auto-surfaced: Ivy's last 1:1 was 18 days ago. Quarterly Conversation overdue. People module flagged W=No on her GWC.",
      },
    ],
  },
  {
    id: "i_seed_4",
    title: "Task Velocity dropped to 71% — 4th consecutive weekly decline",
    context:
      "Baruc's task velocity has fallen from 85% → 71% over 4 weeks. This correlates with the Quintessa agent build overlapping with Toolkit T1 milestones. May need capacity rebalancing or rock reprioritization.",
    severity: "high",
    stage: "discuss",
    source: "scorecard",
    sourceLabel: "SCORECARD AUTO",
    ownerId: "u_bar",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    ageLabel: "5D",
    rank: 4,
    queue: "open",
    pinnedForL10: true,
    linkedMetricId: "m_velocity",
    patternHint: "Velocity declining 4 weeks; correlates with Baruc capacity spike",
    activity: [
      {
        id: "a_seed_4_0",
        authorLabel: "SCORECARD AUTO · 5D AGO",
        at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Auto-flagged: Task Velocity below 80% threshold.",
      },
      {
        id: "a_seed_4_1",
        authorLabel: "GEORGE · 4D AGO",
        at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Moved to discuss. Bringing to Monday L10 — Baruc to speak to capacity.",
      },
    ],
  },
  // ── Solved ──────────────────────────────────────────────────
  {
    id: "i_seed_5",
    title: "Quintessa agent training data not versioned in repo",
    context:
      "STACY v1 training prompts were living in a shared Google Doc with no version control. Any prompt change was invisible to the rest of the team and impossible to roll back.",
    severity: "normal",
    stage: "solve",
    source: "user",
    sourceLabel: "BARUC · DROP",
    ownerId: "u_bar",
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    ageLabel: "14D",
    rank: 1,
    queue: "solved",
    pinnedForL10: false,
    resolution: {
      path: "task",
      payload: { taskTitle: "Migrate STACY prompts to /agents/stacy/v1/ in repo" },
      resolvedBy: "u_bar",
      resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      reason: "All prompts now versioned in GitHub under /agents/stacy/. PR merged.",
    },
    activity: [
      {
        id: "a_seed_5_0",
        authorLabel: "BARUC · 14D AGO",
        at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Issue dropped.",
      },
      {
        id: "a_seed_5_1",
        authorLabel: "BARUC · 7D AGO",
        at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Resolved → TASK. Prompts migrated to repo. PR #42 merged.",
      },
    ],
  },
  {
    id: "i_seed_6",
    title: "L10 meeting template not fully configured",
    context:
      "The default L10 agenda was missing the Scorecard segment and had incorrect durations for IDS. Brooklyn flagged during the Apr 21 L10 run.",
    severity: "normal",
    stage: "solve",
    source: "user",
    sourceLabel: "BROOKLYN · DROP",
    ownerId: "u_bro",
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    ageLabel: "8D",
    rank: 2,
    queue: "solved",
    pinnedForL10: false,
    resolution: {
      path: "decision",
      payload: { decision: "Updated default agenda: Scorecard 5min, IDS 30min, Conclude 5min" },
      resolvedBy: "u_geo",
      resolvedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      reason: "Agenda updated in L10 settings. All future meetings use correct template.",
    },
    activity: [
      {
        id: "a_seed_6_0",
        authorLabel: "BROOKLYN · 8D AGO",
        at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Issue dropped.",
      },
      {
        id: "a_seed_6_1",
        authorLabel: "GEORGE · 6D AGO",
        at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        body: "Resolved → DECISION. Agenda fixed.",
      },
    ],
  },
]

export const SEED_AI_SUGGESTIONS: AISuggestion[] = [
  {
    id: "ai_s_1",
    title: "Sales cycle trending up — now 34d vs 21d target",
    context:
      "Sales cycle has increased from 19 → 34 days over 4 weeks. At current trajectory it will exceed 40 days by May. Suggest IDS: diagnose qualification stage bottleneck.",
    severity: "high",
    reason: "Sales cycle metric increased 79% over 4 weeks without an open issue tracking it.",
    dismissed: false,
  },
  {
    id: "ai_s_2",
    title: "Brooklyn's GWC C-score is pending — seat clarity needed",
    context:
      "Brooklyn's Capacity score is marked as pending review. With T1 launch and VSL shoot overlapping, this creates a risk of burnout or under-delivery on Integrator responsibilities.",
    severity: "normal",
    reason: "People module shows pending GWC for an Integrator seat. EOS flags this as a leadership risk.",
    dismissed: false,
  },
]
