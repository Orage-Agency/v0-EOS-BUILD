"use client"

import { create } from "zustand"
import { USERS, ROCKS, type MockUser } from "@/lib/mock-data"

export type GWCAnswer = "yes" | "no" | "pending"
export type SignalTrend = "up" | "down" | "flat"
export type SignalTone = "green" | "yellow" | "red"

export type PersonProfile = {
  userId: string
  title: string
  seatRoles: string[]
  bio?: string
  joinedAt: string // ISO date
  timezone: string
  slack: string
  managerId?: string
  reportsToLabel?: string
  lastOneOnOne?: number // timestamp
  quarterlyConversation: {
    quarter: string
    dueThisWeek: boolean
    workingNote?: string
    notWorkingNote?: string
    coreValuesNote?: string
    gwcReevalNote?: string
  }
  gwc: {
    quarter: string
    capturedAt: string
    g: { answer: GWCAnswer; note?: string }
    w: { answer: GWCAnswer; note?: string }
    c: { answer: GWCAnswer; note?: string }
    trend?: string
  }
  signals: PerformanceSignal[]
  ownedRockIds: string[]
}

export type PerformanceSignal = {
  id: string
  label: string
  value: string
  trend: SignalTrend
  trendLabel: string
  fillPct: number
  tone: SignalTone
  context: string
}

export type ActionItem = {
  id: string
  text: string
  ownerLabel?: string
  done: boolean
  dueLabel?: string
  dueTone?: "muted" | "warn" | "danger"
}

export type OneOnOne = {
  id: string
  personId: string
  withId: string
  scheduledAt: number
  durationMin: number
  status: "upcoming" | "completed" | "missed" | "cancelled"
  title: string
  agenda?: string
  notes?: string
  preview?: string
  actions: ActionItem[]
}

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.now()

/**
 * Reset-to-Zero: profile shells stay so name/title cards render, but every
 * activity-derived signal (gwc, lastOneOnOne, signals, ownedRockIds) is
 * empty until the master fills them in via the onboarding wizard or the
 * regular flows.
 */
const seedProfiles: Record<string, PersonProfile> = {
  u_geo: {
    userId: "u_geo",
    title: "Visionary · CEO",
    seatRoles: ["Long-range vision + 10-year target", "Strategic relationships + partnerships", "Founder-led sales for Tier 2"],
    joinedAt: "2024-01-04",
    timezone: "America/Mexico_City",
    slack: "@george",
    lastOneOnOne: NOW - 8 * DAY,
    quarterlyConversation: {
      quarter: "Q2 2026",
      dueThisWeek: false,
      workingNote: "Founder sales pipeline expanding; Verdictly deal closed ahead of schedule.",
      notWorkingNote: "Capacity split between sales + product direction is stretching thin.",
      coreValuesNote: "Consistently defaults to action — ships first, iterates fast.",
      gwcReevalNote: "All 3 — no changes recommended this quarter.",
    },
    gwc: {
      quarter: "Q2 2026",
      capturedAt: "APR 14, 2026",
      g: { answer: "yes", note: "Deep domain understanding of AI + EOS operating model." },
      w: { answer: "yes", note: "Highly motivated — building for a 10-year outcome." },
      c: { answer: "yes", note: "Bandwidth tight but managed; no signs of burnout." },
      trend: "Stable",
    },
    signals: [
      { id: "s1", label: "ROCKS ON TRACK", value: "2/2", trend: "up", trendLabel: "+1 vs last Q", fillPct: 100, tone: "green", context: "Both Q2 rocks showing green velocity." },
      { id: "s2", label: "TASKS COMPLETED", value: "14/18", trend: "flat", trendLabel: "78% on time", fillPct: 78, tone: "yellow", context: "4 tasks slipped; all non-critical path." },
      { id: "s3", label: "MEETING ATTENDANCE", value: "4/4", trend: "up", trendLabel: "100% L10", fillPct: 100, tone: "green", context: "Perfect L10 attendance this quarter." },
    ],
    ownedRockIds: [],
  },
  u_bro: {
    userId: "u_bro",
    title: "Integrator · COO",
    seatRoles: ["Run the day-to-day · drive accountability", "L10 cadence + meeting rhythm", "Toolkit T1 launch ownership"],
    joinedAt: "2024-03-12",
    timezone: "America/Mexico_City",
    slack: "@brooklyn",
    managerId: "u_geo",
    reportsToLabel: "GEORGE",
    lastOneOnOne: NOW - 5 * DAY,
    quarterlyConversation: {
      quarter: "Q2 2026",
      dueThisWeek: false,
      workingNote: "VSL production on track; landing page direction locked.",
      notWorkingNote: "Toolkit T1 milestone slippage — Stripe entitlement scope grew late.",
      coreValuesNote: "Shows the work consistently — updates, docs, async Looms are thorough.",
      gwcReevalNote: "C is pending — review capacity after T1 launch.",
    },
    gwc: {
      quarter: "Q2 2026",
      capturedAt: "APR 14, 2026",
      g: { answer: "yes", note: "Strong operational instincts; runs L10 rhythm well." },
      w: { answer: "yes", note: "Driven by the product vision — high ownership energy." },
      c: { answer: "pending", note: "Reassess after T1 launch — currently at full capacity." },
      trend: "Monitoring",
    },
    signals: [
      { id: "s4", label: "ROCKS ON TRACK", value: "1/2", trend: "down", trendLabel: "T1 at risk", fillPct: 50, tone: "yellow", context: "Toolkit T1 Rock flagged at-risk; onboarding Rock on track." },
      { id: "s5", label: "TASKS COMPLETED", value: "11/15", trend: "flat", trendLabel: "73% on time", fillPct: 73, tone: "yellow", context: "Mostly design + doc tasks; 4 open." },
      { id: "s6", label: "1:1 CADENCE", value: "3/4 WKS", trend: "flat", trendLabel: "One missed", fillPct: 75, tone: "yellow", context: "Missed week 3 due to VSL shoot conflict." },
    ],
    ownedRockIds: [],
  },
  u_bar: {
    userId: "u_bar",
    title: "AI Engineer · Voice Systems",
    seatRoles: ["Build & maintain client voice agents", "Own Quintessa intake routing reliability", "SIP/telephony layer ownership"],
    joinedAt: "2026-01-14",
    timezone: "America/Mexico_City",
    slack: "@baruc",
    managerId: "u_bro",
    reportsToLabel: "BROOKLYN",
    lastOneOnOne: NOW - 3 * DAY,
    quarterlyConversation: {
      quarter: "Q2 2026",
      dueThisWeek: true,
      workingNote: "Quintessa call routing is stable; QA pass scheduled for Apr 26.",
      notWorkingNote: "Spec clarity on Toolkit T1 agent layer still blocking final build.",
      coreValuesNote: "Compounds the system well — self-documents everything, great handoffs.",
      gwcReevalNote: "All green. Strong first quarter in seat.",
    },
    gwc: {
      quarter: "Q2 2026",
      capturedAt: "APR 14, 2026",
      g: { answer: "yes", note: "Strongest voice-agent technical chops on the team." },
      w: { answer: "yes", note: "High initiative — ships without being asked." },
      c: { answer: "yes", note: "102 days in seat, fully ramped and producing." },
      trend: "Up",
    },
    signals: [
      { id: "s7", label: "DEPLOYMENTS", value: "3 LIVE", trend: "up", trendLabel: "+1 this Q", fillPct: 100, tone: "green", context: "STACY v1, NOVA, Quintessa routing all live in prod." },
      { id: "s8", label: "INCIDENTS", value: "0 P1", trend: "up", trendLabel: "Clean Q", fillPct: 100, tone: "green", context: "No P1 incidents this quarter — 100% uptime across clients." },
      { id: "s9", label: "TASKS COMPLETED", value: "8/9", trend: "up", trendLabel: "89% on time", fillPct: 89, tone: "green", context: "1 task pending spec sign-off from Brooklyn." },
    ],
    ownedRockIds: [],
  },
  u_ivy: {
    userId: "u_ivy",
    title: "Marketing · Outbound",
    seatRoles: ["Outbound prospecting + list building", "Content + LinkedIn distribution", "Discovery call booking · target 8/wk"],
    joinedAt: "2025-11-03",
    timezone: "America/Mexico_City",
    slack: "@ivy",
    managerId: "u_bro",
    reportsToLabel: "BROOKLYN",
    lastOneOnOne: NOW - 18 * DAY,
    quarterlyConversation: {
      quarter: "Q2 2026",
      dueThisWeek: true,
      workingNote: "LinkedIn content consistent; Boomer coordination moving forward.",
      notWorkingNote: "Discovery call booking below target — 5/wk vs 8/wk goal.",
      coreValuesNote: "Shows the work — weekly reports thorough; proactive on blockers.",
      gwcReevalNote: "W answer may need revisit — explore alignment on outbound role scope.",
    },
    gwc: {
      quarter: "Q2 2026",
      capturedAt: "APR 14, 2026",
      g: { answer: "yes", note: "Strong content instincts + outbound execution fundamentals." },
      w: { answer: "no", note: "Unclear alignment on outbound-heavy role vs creative work." },
      c: { answer: "pending", note: "Call volume below target — investigate capacity or motivation." },
      trend: "Needs Attention",
    },
    signals: [
      { id: "s10", label: "DISCOVERY CALLS", value: "5/WK", trend: "down", trendLabel: "vs 8 target", fillPct: 63, tone: "yellow", context: "Below 8/wk target for 3 consecutive weeks." },
      { id: "s11", label: "CONTENT POSTS", value: "4/WK", trend: "flat", trendLabel: "On cadence", fillPct: 80, tone: "green", context: "LinkedIn cadence consistent. Engagement up 12%." },
      { id: "s12", label: "LAST 1:1", value: "18D AGO", trend: "down", trendLabel: "Overdue", fillPct: 20, tone: "red", context: "1:1 cadence slipping — schedule for this week." },
    ],
    ownedRockIds: [],
  },
}

const seedOneOnOnes: OneOnOne[] = [
  {
    id: "ooo-1",
    personId: "u_bro",
    withId: "u_geo",
    scheduledAt: NOW - 5 * DAY,
    durationMin: 30,
    status: "completed",
    title: "Brooklyn 1:1",
    agenda: "T1 milestone review · Stripe scope · VSL shoot debrief",
    notes: "T1 Stripe entitlement grew scope — adding 3 days. VSL shoot went well, rough cut by Friday. Brooklyn wants to revisit Marketing Lead hire timeline.",
    preview: "T1 scope grew; VSL rough cut Friday",
    actions: [
      { id: "a1", text: "Brooklyn: lock Stripe scope by Apr 30", ownerLabel: "BROOKLYN", done: false, dueLabel: "APR 30", dueTone: "warn" },
      { id: "a2", text: "George: confirm Marketing Lead hire budget for Q3", ownerLabel: "GEORGE", done: false, dueLabel: "MAY 7", dueTone: "muted" },
    ],
  },
  {
    id: "ooo-2",
    personId: "u_bar",
    withId: "u_geo",
    scheduledAt: NOW - 3 * DAY,
    durationMin: 30,
    status: "completed",
    title: "Baruc 1:1",
    agenda: "Quintessa QA · T1 agent spec blocker · NOVA feedback",
    notes: "QA pass scheduled Apr 26 — 30 transfer calls, looking clean. T1 agent spec still needs Brooklyn sign-off on entitlement gating before Baruc can finalize. NOVA client very happy.",
    preview: "QA Apr 26; T1 spec needs Brooklyn sign-off",
    actions: [
      { id: "a3", text: "Brooklyn: unblock T1 agent spec sign-off by Apr 28", ownerLabel: "BROOKLYN", done: true, dueLabel: "DONE", dueTone: "muted" },
      { id: "a4", text: "Baruc: complete Quintessa QA pass Apr 26", ownerLabel: "BARUC", done: false, dueLabel: "APR 26", dueTone: "warn" },
    ],
  },
]

type Role = "founder" | "admin" | "leader" | "member" | "viewer" | "field"

export type Invite = {
  id: string
  email: string
  fullName?: string
  role: Role
  reportsToId?: string
  note?: string
  sentAt: number
}

type State = {
  profiles: Record<string, PersonProfile>
  oneOnOnes: OneOnOne[]
  invites: Invite[]
  drawerOneOnOneId: string | null
  inviteOpen: boolean
  scheduleOpenForPersonId: string | null
  selectedRole: Role
}

type Actions = {
  // selectors
  getProfile: (userId: string) => PersonProfile | undefined
  getOneOnOnesFor: (personId: string) => OneOnOne[]
  getOneOnOne: (id: string) => OneOnOne | undefined
  // GWC
  cycleGWC: (userId: string, key: "g" | "w" | "c") => void
  setGWCNote: (userId: string, key: "g" | "w" | "c", note: string) => void
  // 1:1 drawer
  openOneOnOneDrawer: (id: string) => void
  closeOneOnOneDrawer: () => void
  updateOneOnOneTitle: (id: string, title: string) => void
  updateOneOnOneAgenda: (id: string, agenda: string) => void
  updateOneOnOneNotes: (id: string, notes: string) => void
  toggleAction: (oneOnOneId: string, actionId: string) => void
  scheduleOneOnOne: (personId: string, scheduledAt: number, durationMin: number) => string
  // invite modal
  openInvite: () => void
  closeInvite: () => void
  setInviteRole: (role: Role) => void
  sendInvite: (data: Omit<Invite, "id" | "sentAt">) => void
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export const usePeopleStore = create<State & Actions>((set, get) => ({
  profiles: seedProfiles,
  oneOnOnes: seedOneOnOnes,
  invites: [],
  drawerOneOnOneId: null,
  inviteOpen: false,
  scheduleOpenForPersonId: null,
  selectedRole: "member",

  getProfile: (userId) => get().profiles[userId],
  getOneOnOnesFor: (personId) =>
    get()
      .oneOnOnes.filter((o) => o.personId === personId)
      .sort((a, b) => b.scheduledAt - a.scheduledAt),
  getOneOnOne: (id) => get().oneOnOnes.find((o) => o.id === id),

  cycleGWC: (userId, key) =>
    set((s) => {
      const profile = s.profiles[userId]
      if (!profile) return s
      const cycle: Record<GWCAnswer, GWCAnswer> = {
        yes: "no",
        no: "pending",
        pending: "yes",
      }
      return {
        profiles: {
          ...s.profiles,
          [userId]: {
            ...profile,
            gwc: {
              ...profile.gwc,
              [key]: { ...profile.gwc[key], answer: cycle[profile.gwc[key].answer] },
            },
          },
        },
      }
    }),

  setGWCNote: (userId, key, note) =>
    set((s) => {
      const profile = s.profiles[userId]
      if (!profile) return s
      return {
        profiles: {
          ...s.profiles,
          [userId]: {
            ...profile,
            gwc: {
              ...profile.gwc,
              [key]: { ...profile.gwc[key], note },
            },
          },
        },
      }
    }),

  openOneOnOneDrawer: (id) => set({ drawerOneOnOneId: id }),
  closeOneOnOneDrawer: () => set({ drawerOneOnOneId: null }),

  updateOneOnOneTitle: (id, title) =>
    set((s) => ({
      oneOnOnes: s.oneOnOnes.map((o) => (o.id === id ? { ...o, title } : o)),
    })),
  updateOneOnOneAgenda: (id, agenda) =>
    set((s) => ({
      oneOnOnes: s.oneOnOnes.map((o) => (o.id === id ? { ...o, agenda } : o)),
    })),
  updateOneOnOneNotes: (id, notes) =>
    set((s) => ({
      oneOnOnes: s.oneOnOnes.map((o) => (o.id === id ? { ...o, notes } : o)),
    })),

  toggleAction: (oneOnOneId, actionId) =>
    set((s) => ({
      oneOnOnes: s.oneOnOnes.map((o) =>
        o.id !== oneOnOneId
          ? o
          : {
              ...o,
              actions: o.actions.map((a) =>
                a.id === actionId
                  ? {
                      ...a,
                      done: !a.done,
                      dueLabel: !a.done ? "DONE" : a.dueLabel,
                      dueTone: !a.done ? ("muted" as const) : a.dueTone,
                    }
                  : a,
              ),
            },
      ),
    })),

  scheduleOneOnOne: (personId, scheduledAt, durationMin) => {
    const id = uid("ooo")
    const target = USERS.find((u) => u.id === personId)
    set((s) => ({
      oneOnOnes: [
        ...s.oneOnOnes,
        {
          id,
          personId,
          withId: USERS[0].id,
          scheduledAt,
          durationMin,
          status: "upcoming" as const,
          title: `${target?.name.split(" ")[0] ?? "—"} 1:1`,
          actions: [],
        },
      ],
    }))
    return id
  },

  openInvite: () => set({ inviteOpen: true }),
  closeInvite: () => set({ inviteOpen: false }),
  setInviteRole: (role) => set({ selectedRole: role }),

  sendInvite: (data) =>
    set((s) => ({
      invites: [
        ...s.invites,
        { id: uid("inv"), sentAt: Date.now(), ...data },
      ],
      inviteOpen: false,
    })),
}))

// Helpers
export function userById(id?: string): MockUser | undefined {
  if (!id) return undefined
  return USERS.find((u) => u.id === id)
}

export function tenureDays(joinedAtIso: string): number {
  const ms = Date.now() - new Date(joinedAtIso).getTime()
  return Math.max(0, Math.round(ms / DAY))
}

export function formatJoined(joinedAtIso: string): string {
  const d = new Date(joinedAtIso)
  return d
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase()
}

export function daysAgo(ts: number): number {
  return Math.max(0, Math.round((Date.now() - ts) / DAY))
}
