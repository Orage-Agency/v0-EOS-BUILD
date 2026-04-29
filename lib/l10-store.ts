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

const seedMeetings: Meeting[] = []

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
