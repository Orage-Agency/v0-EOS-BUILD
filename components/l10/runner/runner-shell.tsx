"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useEffect } from "react"
import { useL10Store } from "@/lib/l10-store"
import { AgendaRail } from "./agenda-rail"
import { MainStage } from "./main-stage"
import { ParticipantsRail } from "./participants-rail"
import { ConcludeModal } from "./conclude-modal"
import { IcChevronLeft } from "@/components/orage/icons"

export function RunnerShell({ id }: { id: string }) {
  const meeting = useL10Store((s) => s.getMeeting(id))

  // Lock body scroll while runner is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

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
