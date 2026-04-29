"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useEffect, useRef, useCallback } from "react"
import { useL10Store, type Meeting } from "@/lib/l10-store"
import { createClient } from "@/lib/supabase/client"
import { saveMeetingState } from "@/app/actions/l10"
import { AgendaRail } from "./agenda-rail"
import { MainStage } from "./main-stage"
import { ParticipantsRail } from "./participants-rail"
import { ConcludeModal } from "./conclude-modal"
import { IcChevronLeft } from "@/components/orage/icons"

export function RunnerShell({ id, workspaceSlug }: { id: string; workspaceSlug?: string }) {
  const meeting = useL10Store((s) => s.getMeeting(id))
  const startMeeting = useL10Store((s) => s.startMeeting)
  const setMeetings = useL10Store((s) => s.setMeetings)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistDebounced = useCallback(
    (m: Meeting) => {
      if (!workspaceSlug) return
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        saveMeetingState(workspaceSlug, m).catch(console.error)
      }, 800)
    },
    [workspaceSlug],
  )

  // Lock body scroll while runner is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // Activate first segment + mark meeting in_session on mount
  useEffect(() => {
    startMeeting(id)
  }, [id, startMeeting])

  // Persist meeting state whenever it changes (debounced, skips timer ticks)
  useEffect(() => {
    if (!meeting) return
    persistDebounced(meeting)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting?.status, meeting?.agenda, meeting?.ids, meeting?.captures, meeting?.participants, meeting?.cascadingMessage])

  // Supabase Realtime: subscribe to meeting updates from other clients
  useEffect(() => {
    if (!workspaceSlug) return
    const supabase = createClient()
    const channel = supabase
      .channel(`meeting:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "meetings",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            title: string
            scheduled_at: string
            started_at: string | null
            ended_at: string | null
            agenda: unknown
            summary_text: string | null
          }
          const agendaPayload = (row.agenda ?? {}) as Partial<Meeting>
          const updated: Meeting = {
            id: row.id,
            name: row.title,
            type: "L10",
            scheduledAt: new Date(row.scheduled_at).getTime(),
            durationMin: agendaPayload.durationMin ?? 90,
            status: row.ended_at
              ? "concluded"
              : row.started_at
                ? "in_session"
                : "scheduled",
            startedAt: row.started_at ? new Date(row.started_at).getTime() : undefined,
            concludedAt: row.ended_at ? new Date(row.ended_at).getTime() : undefined,
            agenda: agendaPayload.agenda ?? [],
            participants: agendaPayload.participants ?? [],
            ids: agendaPayload.ids ?? [],
            captures: agendaPayload.captures ?? [],
            cascadingMessage: row.summary_text ?? agendaPayload.cascadingMessage,
            attendedCount: agendaPayload.attendedCount,
            notesPosted: agendaPayload.notesPosted,
          }
          setMeetings(
            useL10Store.getState().meetings.map((m) => (m.id === id ? updated : m)),
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, workspaceSlug, setMeetings])

  if (!meeting) {
    return (
      <div className="fixed inset-0 z-50 bg-bg-1 flex items-center justify-center">
        <div className="card-glass p-8 text-center">
          <div className="text-sm text-text-muted mb-3">Meeting not found.</div>
          <Link href="/l10" className="text-gold-400 underline text-xs">
            Back to L10
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-1 flex flex-col">
      <Link
        href={`/l10/${id}`}
        className="absolute top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 text-[10px] text-text-muted hover:text-text-primary px-2.5 py-1 rounded-sm bg-bg-3/80 border border-border-orage backdrop-blur transition-colors font-mono"
      >
        <IcChevronLeft className="w-3 h-3" />
        EXIT RUNNER
      </Link>
      <div className="flex flex-1 overflow-hidden">
        <AgendaRail meetingId={id} />
        <MainStage meetingId={id} />
        <ParticipantsRail meetingId={id} />
      </div>
      <ConcludeModal meetingId={id} />
    </div>
  )
}
