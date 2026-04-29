"use client"

import { create } from "zustand"
import { CURRENT_USER, USERS, type MockUser } from "@/lib/mock-data"

export type AgendaSegment =
  | "segue"
  | "scorecard"
  | "rock_review"
  | "headlines"
  | "todos"
  | "ids"
  | "conclude"

export type SegmentStatus = "pending" | "active" | "done"

export type AgendaItem = {
  id: string
  segment: AgendaSegment
  name: string
  durationSec: number
  actualSec?: number
  status: SegmentStatus
}

export type IDSStage = "identify" | "discuss" | "solve"

export type IDSIssue = {
  id: string
  rank: number
  title: string
  context?: string
  source: "manual" | "ai" | "scorecard" | "rock"
  sourceLabel: string
  ownerId?: string
  severity: "high" | "med" | "low"
  stage: IDSStage
  notes?: string
  resolved?: boolean
  resolvedAs?: "rock" | "task" | "headline" | "table"
}

export type CaptureKind = "todo" | "decision" | "headline" | "park" | "note"

export type LiveCapture = {
  id: string
  kind: CaptureKind
  text: string
  ownerId?: string
  ownerLabel?: string
  createdAt: number
}

export type ParticipantStatus = "speaking" | "active" | "away"

export type Participant = {
  userId: string
  status: ParticipantStatus
  rating?: number
}

export type MeetingStatus = "scheduled" | "in_session" | "concluded"

export type Meeting = {
  id: string
  name: string
  type: "L10"
  scheduledAt: number
  durationMin: number
  status: MeetingStatus
  startedAt?: number
  concludedAt?: number
  agenda: AgendaItem[]
  participants: Participant[]
  ids: IDSIssue[]
  captures: LiveCapture[]
  cascadingMessage?: string
  attendedCount?: number
  notesPosted?: boolean
}

const MIN = 60
const HR = 60 * MIN
const DAY = 24 * HR
const NOW = Date.now()

function defaultAgenda(): AgendaItem[] {
  return [
    { id: "a1", segment: "segue", name: "SEGUE", durationSec: 5 * MIN, status: "pending" },
    { id: "a2", segment: "scorecard", name: "SCORECARD", durationSec: 5 * MIN, status: "pending" },
    { id: "a3", segment: "rock_review", name: "ROCK REVIEW", durationSec: 5 * MIN, status: "pending" },
    { id: "a4", segment: "headlines", name: "HEADLINES", durationSec: 5 * MIN, status: "pending" },
    { id: "a5", segment: "todos", name: "TO-DOS", durationSec: 5 * MIN, status: "pending" },
    { id: "a6", segment: "ids", name: "IDS · IDENTIFY · DISCUSS · SOLVE", durationSec: 60 * MIN, status: "pending" },
    { id: "a7", segment: "conclude", name: "CONCLUDE", durationSec: 5 * MIN, status: "pending" },
  ]
}

function defaultParticipants(): Participant[] {
  return USERS.map((u, i) => ({
    userId: u.id,
    status: i === 3 ? "away" : "active",
  }))
}

// Monday 22:00 UTC timestamps for Apr 27 – Jun 8 2026 (= 5:00 PM CDMX / CDT UTC-5)
const T_APR27 = 1777327200000
const T_MAY04 = 1777932000000
const T_MAY11 = 1778536800000
const T_MAY18 = 1779141600000
const T_MAY25 = 1779746400000
const T_JUN01 = 1780351200000
const T_JUN08 = 1780956000000

const seedMeetings: Meeting[] = [
  /* ── APR 27 — concluded ──────────────────────────────── */
  {
    id: "mtg-apr27",
    name: "L10 LEADERSHIP · MON APR 27",
    type: "L10",
    scheduledAt: T_APR27,
    durationMin: 90,
    status: "concluded",
    startedAt: T_APR27,
    concludedAt: T_APR27 + 95 * MIN * 1000,
    attendedCount: 3,
    notesPosted: true,
    cascadingMessage: "Align on Q2 rock priorities — onboarding checklist becomes the flagship Rock.",
    agenda: [
      { id: "a1", segment: "segue",      name: "SEGUE",                        durationSec: 5  * MIN, actualSec: 4  * MIN, status: "done" },
      { id: "a2", segment: "scorecard",  name: "SCORECARD",                    durationSec: 5  * MIN, actualSec: 7  * MIN, status: "done" },
      { id: "a3", segment: "rock_review",name: "ROCK REVIEW",                  durationSec: 5  * MIN, actualSec: 5  * MIN, status: "done" },
      { id: "a4", segment: "headlines",  name: "HEADLINES",                    durationSec: 5  * MIN, actualSec: 8  * MIN, status: "done" },
      { id: "a5", segment: "todos",      name: "TO-DOS",                       durationSec: 5  * MIN, actualSec: 5  * MIN, status: "done" },
      { id: "a6", segment: "ids",        name: "IDS · IDENTIFY · DISCUSS · SOLVE", durationSec: 60 * MIN, actualSec: 53 * MIN, status: "done" },
      { id: "a7", segment: "conclude",   name: "CONCLUDE",                     durationSec: 5  * MIN, actualSec: 4  * MIN, status: "done" },
    ],
    participants: [
      { userId: "u_geo", status: "active", rating: 8 },
      { userId: "u_bro", status: "active", rating: 9 },
      { userId: "u_bar", status: "active", rating: 7 },
      { userId: "u_ivy", status: "away" },
    ],
    ids: [
      {
        id: "ids-p1", rank: 1,
        title: "Client onboarding takes too long — losing momentum post-close",
        context: "Three clients in Q1 went silent during onboarding. Avg time to first deliverable is 14 days.",
        source: "manual", sourceLabel: "George", ownerId: "u_geo",
        severity: "high", stage: "solve",
        notes: "Build a 48-hour fast-track checklist. Brooklyn owns the template by May 2.",
        resolved: true, resolvedAs: "rock",
      },
      {
        id: "ids-p2", rank: 2,
        title: "Proposal template doesn't reflect new pricing — two misquotes sent",
        context: "Sales team still using old deck. Brooklyn caught it but others may not.",
        source: "manual", sourceLabel: "Brooklyn", ownerId: "u_bro",
        severity: "med", stage: "solve",
        notes: "Brooklyn to update and lock proposal template by Friday.",
        resolved: true, resolvedAs: "task",
      },
    ],
    captures: [
      { id: "cap-p1", kind: "decision",  text: "Fast-track onboarding checklist is a Q2 Rock — owned by Brooklyn, due June 30.", ownerId: "u_geo", ownerLabel: "GEORGE",   createdAt: T_APR27 + 30 * MIN * 1000 },
      { id: "cap-p2", kind: "todo",      text: "Brooklyn: update proposal template before Friday EOD.",                           ownerId: "u_bro", ownerLabel: "BROOKLYN", createdAt: T_APR27 + 45 * MIN * 1000 },
      { id: "cap-p3", kind: "headline",  text: "Closed Verdictly AZ deal — $250 CPL, first leads flowing.",                     ownerId: "u_geo", ownerLabel: "GEORGE",   createdAt: T_APR27 + 20 * MIN * 1000 },
      { id: "cap-p4", kind: "todo",      text: "Baruc: pull Q1 scorecard actuals and post in Slack by EOW.",                    ownerId: "u_bar", ownerLabel: "BARUC",    createdAt: T_APR27 + 50 * MIN * 1000 },
      { id: "cap-p5", kind: "note",      text: "Ivy out next week — async Loom for her rock review.",                           ownerId: "u_geo", ownerLabel: "GEORGE",   createdAt: T_APR27 + 80 * MIN * 1000 },
    ],
  },

  /* ── MAY 4 — upcoming (pre-loaded IDS from last week's parks) ── */
  {
    id: "mtg-may04",
    name: "L10 LEADERSHIP · MON MAY 4",
    type: "L10",
    scheduledAt: T_MAY04,
    durationMin: 90,
    status: "scheduled",
    agenda: defaultAgenda(),
    participants: defaultParticipants(),
    ids: [
      {
        id: "ids-a1", rank: 1,
        title: "Organic traffic down 22% since Apr 21 — SEO algo update suspected",
        context: "Analytics showing a sharp drop. No content changes on our end. May need an agency review.",
        source: "scorecard", sourceLabel: "Scorecard", ownerId: "u_bar",
        severity: "high", stage: "identify",
        resolved: false,
      },
      {
        id: "ids-a2", rank: 2,
        title: "Onboarding Rock scope still unclear — need a 'done' definition",
        context: "Carried from last week. Brooklyn hasn't locked the checklist template yet.",
        source: "rock", sourceLabel: "Q2 Rock", ownerId: "u_bro",
        severity: "med", stage: "identify",
        resolved: false,
      },
    ],
    captures: [],
  },

  /* ── MAY 11 ── */
  {
    id: "mtg-may11",
    name: "L10 LEADERSHIP · MON MAY 11",
    type: "L10",
    scheduledAt: T_MAY11,
    durationMin: 90,
    status: "scheduled",
    agenda: defaultAgenda(),
    participants: defaultParticipants(),
    ids: [],
    captures: [],
  },

  /* ── MAY 18 ── */
  {
    id: "mtg-may18",
    name: "L10 LEADERSHIP · MON MAY 18",
    type: "L10",
    scheduledAt: T_MAY18,
    durationMin: 90,
    status: "scheduled",
    agenda: defaultAgenda(),
    participants: defaultParticipants(),
    ids: [],
    captures: [],
  },

  /* ── MAY 25 ── */
  {
    id: "mtg-may25",
    name: "L10 LEADERSHIP · MON MAY 25",
    type: "L10",
    scheduledAt: T_MAY25,
    durationMin: 90,
    status: "scheduled",
    agenda: defaultAgenda(),
    participants: defaultParticipants(),
    ids: [],
    captures: [],
  },

  /* ── JUN 1 ── */
  {
    id: "mtg-jun01",
    name: "L10 LEADERSHIP · MON JUN 1",
    type: "L10",
    scheduledAt: T_JUN01,
    durationMin: 90,
    status: "scheduled",
    agenda: defaultAgenda(),
    participants: defaultParticipants(),
    ids: [],
    captures: [],
  },

  /* ── JUN 8 ── */
  {
    id: "mtg-jun08",
    name: "L10 LEADERSHIP · MON JUN 8",
    type: "L10",
    scheduledAt: T_JUN08,
    durationMin: 90,
    status: "scheduled",
    agenda: defaultAgenda(),
    participants: defaultParticipants(),
    ids: [],
    captures: [],
  },
]

type State = {
  meetings: Meeting[]
  // Runner state
  timerSec: number
  timerRunning: boolean
  concludeOpen: boolean
  toast: string | null
}

type Actions = {
  // Selectors
  getMeeting: (id: string) => Meeting | undefined
  getActiveSegment: (id: string) => AgendaItem | undefined
  // Timer
  setTimerSec: (sec: number) => void
  tickTimer: () => void
  setTimerRunning: (running: boolean) => void
  addTime: (sec: number) => void
  // Agenda
  advanceRound: (meetingId: string) => void
  // IDS
  setIDSStage: (meetingId: string, idsId: string, stage: IDSStage) => void
  setIDSNotes: (meetingId: string, idsId: string, notes: string) => void
  resolveIDS: (
    meetingId: string,
    idsId: string,
    as: "rock" | "task" | "headline" | "table",
  ) => void
  reorderIDS: (meetingId: string, fromId: string, toId: string) => void
  // Captures
  addCapture: (meetingId: string, kind: CaptureKind, text: string, owner?: MockUser) => void
  // Participants
  setParticipantStatus: (meetingId: string, userId: string, status: ParticipantStatus) => void
  setParticipantRating: (meetingId: string, userId: string, rating: number) => void
  // Conclude
  openConclude: () => void
  closeConclude: () => void
  setCascadingMessage: (meetingId: string, msg: string) => void
  conclude: (meetingId: string) => void
  // Toast
  showToast: (msg: string) => void
  clearToast: () => void
  // Create
  createMeeting: (when: number) => string
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export const useL10Store = create<State & Actions>((set, get) => ({
  meetings: seedMeetings,
  timerSec: 45 * 60 + 28,
  timerRunning: true,
  concludeOpen: false,
  toast: null,

  getMeeting: (id) => get().meetings.find((m) => m.id === id),
  getActiveSegment: (id) =>
    get()
      .meetings.find((m) => m.id === id)
      ?.agenda.find((a) => a.status === "active"),

  setTimerSec: (sec) => set({ timerSec: Math.max(0, sec) }),
  tickTimer: () => {
    const { timerRunning, timerSec } = get()
    if (!timerRunning) return
    set({ timerSec: Math.max(0, timerSec - 1) })
  },
  setTimerRunning: (running) => set({ timerRunning: running }),
  addTime: (sec) => set((s) => ({ timerSec: s.timerSec + sec })),

  advanceRound: (meetingId) =>
    set((s) => ({
      meetings: s.meetings.map((m) => {
        if (m.id !== meetingId) return m
        const idx = m.agenda.findIndex((a) => a.status === "active")
        if (idx < 0 || idx >= m.agenda.length - 1) return m
        const updated = m.agenda.map((a, i) => {
          if (i === idx) return { ...a, status: "done" as const }
          if (i === idx + 1) return { ...a, status: "active" as const }
          return a
        })
        return { ...m, agenda: updated }
      }),
      timerSec: m_get_next_duration(s.meetings, meetingId) ?? s.timerSec,
    })),

  setIDSStage: (meetingId, idsId, stage) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? { ...m, ids: m.ids.map((i) => (i.id === idsId ? { ...i, stage } : i)) }
          : m,
      ),
    })),

  setIDSNotes: (meetingId, idsId, notes) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? { ...m, ids: m.ids.map((i) => (i.id === idsId ? { ...i, notes } : i)) }
          : m,
      ),
    })),

  resolveIDS: (meetingId, idsId, as) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              ids: m.ids.map((i) =>
                i.id === idsId ? { ...i, resolved: true, resolvedAs: as } : i,
              ),
            }
          : m,
      ),
    })),

  reorderIDS: (meetingId, fromId, toId) =>
    set((s) => ({
      meetings: s.meetings.map((m) => {
        if (m.id !== meetingId) return m
        const items = [...m.ids]
        const fromIdx = items.findIndex((i) => i.id === fromId)
        const toIdx = items.findIndex((i) => i.id === toId)
        if (fromIdx < 0 || toIdx < 0) return m
        const [moved] = items.splice(fromIdx, 1)
        items.splice(toIdx, 0, moved)
        return { ...m, ids: items.map((i, idx) => ({ ...i, rank: idx + 1 })) }
      }),
    })),

  addCapture: (meetingId, kind, text, owner) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              captures: [
                ...m.captures,
                {
                  id: uid("cap"),
                  kind,
                  text,
                  ownerId: owner?.id,
                  ownerLabel: owner ? owner.name.split(" ")[0].toUpperCase() : undefined,
                  createdAt: Date.now(),
                },
              ],
            }
          : m,
      ),
    })),

  setParticipantStatus: (meetingId, userId, status) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              participants: m.participants.map((p) =>
                p.userId === userId ? { ...p, status } : p,
              ),
            }
          : m,
      ),
    })),

  setParticipantRating: (meetingId, userId, rating) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              participants: m.participants.map((p) =>
                p.userId === userId ? { ...p, rating } : p,
              ),
            }
          : m,
      ),
    })),

  openConclude: () => set({ concludeOpen: true }),
  closeConclude: () => set({ concludeOpen: false }),

  setCascadingMessage: (meetingId, msg) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId ? { ...m, cascadingMessage: msg } : m,
      ),
    })),

  conclude: (meetingId) =>
    set((s) => ({
      meetings: s.meetings.map((m) =>
        m.id === meetingId
          ? {
              ...m,
              status: "concluded" as const,
              concludedAt: Date.now(),
              attendedCount: m.participants.filter((p) => p.status !== "away").length,
              notesPosted: true,
              agenda: m.agenda.map((a) =>
                a.status === "active" ? { ...a, status: "done" as const } : a,
              ),
            }
          : m,
      ),
      concludeOpen: false,
    })),

  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),

  createMeeting: (when) => {
    const id = uid("mtg")
    set((s) => ({
      meetings: [
        ...s.meetings,
        {
          id,
          name: "L10 LEADERSHIP",
          type: "L10",
          scheduledAt: when,
          durationMin: 90,
          status: "scheduled",
          agenda: defaultAgenda(),
          participants: defaultParticipants(),
          ids: [],
          captures: [],
        },
      ],
    }))
    return id
  },
}))

function m_get_next_duration(meetings: Meeting[], meetingId: string): number | null {
  const m = meetings.find((mm) => mm.id === meetingId)
  if (!m) return null
  const idx = m.agenda.findIndex((a) => a.status === "active")
  if (idx < 0 || idx >= m.agenda.length - 1) return null
  return m.agenda[idx + 1].durationSec
}

// Helpers
export function userById(id?: string) {
  if (!id) return undefined
  return USERS.find((u) => u.id === id)
}
export const ME = CURRENT_USER
