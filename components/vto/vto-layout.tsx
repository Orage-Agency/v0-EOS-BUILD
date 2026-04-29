"use client"

/**
 * V/TO page shell — header, tabs, auto-save indicator, and slots
 * for the active tab content.
 */

import { useEffect, useRef, type ReactNode } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useVTOStore, type VTOTab } from "@/lib/vto-store"
import { useUIStore } from "@/lib/store"
import { canEditVto } from "@/lib/permissions"

const TABS: { id: VTOTab; label: string }[] = [
  { id: "vision", label: "Vision · 8 Questions" },
  { id: "traction", label: "Traction · Rocks + Issues" },
  { id: "threeYear", label: "3-Year Picture" },
  { id: "tenYear", label: "10-Year Target" },
]

export function VTOLayout({ children }: { children: ReactNode }) {
  const rev = useVTOStore((s) => s.rev)
  const lastEditedLabel = useVTOStore((s) => s.lastEditedLabel)
  const lastEditedBy = useVTOStore((s) => s.lastEditedBy)
  const activeTab = useVTOStore((s) => s.activeTab)
  const setActiveTab = useVTOStore((s) => s.setActiveTab)
  const autosaveAt = useVTOStore((s) => s.autosaveAt)
  const isSaving = useVTOStore((s) => s.isSaving)
  const setIsSaving = useVTOStore((s) => s.setIsSaving)
  const openRevisions = useVTOStore((s) => s.openRevisions)
  const saveRevision = useVTOStore((s) => s.saveRevision)

  const sessionUser = useUIStore((s) => s.currentUser)
  const canEdit = canEditVto({
    id: sessionUser?.id ?? "",
    role: sessionUser?.role as import("@/types/permissions").Role ?? "member",
    isMaster: sessionUser?.isMaster ?? false,
  })

  // Debounced 8s auto-save after the last keystroke.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (autosaveAt == null) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setIsSaving(true)
      // simulate write latency
      setTimeout(() => {
        setIsSaving(false)
        toast("AUTO-SAVED")
      }, 350)
    }, 8000)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [autosaveAt, setIsSaving])

  function manualSave() {
    if (!canEdit) {
      toast("READ-ONLY")
      return
    }
    const summary = window.prompt(
      "Describe this revision",
      "Refined V/TO sections.",
    )
    if (!summary) return
    saveRevision(summary, (sessionUser?.name ?? "USER").split(" ")[0].toUpperCase())
    toast(`SAVED · REV ${rev + 1}`)
  }

  return (
    <div className="relative z-[1] min-h-screen">
      <header className="px-10 pt-6 pb-0 flex items-start justify-between gap-5 flex-wrap">
        <div>
          <div className="flex items-baseline gap-3.5 mb-1">
            <h1 className="font-display text-[42px] tracking-[0.08em] text-gold-400 leading-none">
              VISION<span className="text-text-muted mx-1">/</span>TRACTION
            </h1>
            <span className="inline-block px-2.5 py-1 rounded-sm bg-gold-500/15 border border-border-strong font-display text-[10px] tracking-[0.18em] text-gold-400">
              REV {rev} · APR 21
            </span>
          </div>
          <p className="text-[12px] text-text-muted">
            The strategic backbone · last edited{" "}
            <strong className="text-text-secondary">
              {lastEditedLabel} by {lastEditedBy}
            </strong>{" "}
            · auto-saves every 8s
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {isSaving ? (
            <span className="font-mono text-[10px] text-gold-400 mr-2 tracking-wider">
              SAVING…
            </span>
          ) : null}
          <button
            type="button"
            onClick={openRevisions}
            className="px-3.5 py-2 bg-bg-3 text-text-primary border border-border-orage rounded-sm text-[12px] hover:bg-bg-4 hover:border-gold-500 transition-colors"
          >
            Revisions
          </button>
          <button
            type="button"
            onClick={() => toast("EXPORT QUEUED")}
            className="px-3.5 py-2 bg-bg-3 text-text-primary border border-border-orage rounded-sm text-[12px] hover:bg-bg-4 hover:border-gold-500 transition-colors"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={manualSave}
            disabled={!canEdit}
            className="px-4 py-2 rounded-sm text-[12px] font-semibold flex items-center gap-1.5 transition-shadow text-text-on-gold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-gold"
            style={{
              background:
                "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
              boxShadow: "0 2px 8px rgba(182,128,57,0.3)",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Save Revision
          </button>
        </div>
      </header>

      <nav
        role="tablist"
        aria-label="V/TO tabs"
        className="flex px-10 mt-4 border-b border-border-orage"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "px-5 py-3 font-display text-[13px] tracking-[0.2em] uppercase border-b-2 -mb-px transition-colors",
              activeTab === t.id
                ? "text-gold-400 border-gold-500"
                : "text-text-muted border-transparent hover:text-text-secondary",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="px-6 lg:px-10 py-6 pb-16 max-w-[1400px] mx-auto">
        {children}
      </main>
    </div>
  )
}
