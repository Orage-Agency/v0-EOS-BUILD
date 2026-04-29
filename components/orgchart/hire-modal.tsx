"use client"

import { useEffect } from "react"
import { toast } from "sonner"
import { useOrgChartStore, type HirePath } from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"

const ACTIONS: {
  id: HirePath
  icon: string
  name: string
  desc: string
}[] = [
  {
    id: "start_hiring",
    icon: "+",
    name: "START HIRING",
    desc: "Create a job posting · link to a Hiring Rock",
  },
  {
    id: "assign_person",
    icon: "↗",
    name: "ASSIGN PERSON",
    desc: "Move someone from another seat into this one",
  },
  {
    id: "split_seat",
    icon: "⌖",
    name: "SPLIT SEAT",
    desc: "Distribute roles across existing seats temporarily",
  },
  {
    id: "delete_seat",
    icon: "✕",
    name: "DELETE SEAT",
    desc: "No longer needed in the structure",
  },
]

const PATH_TOAST: Record<HirePath, string> = {
  start_hiring: "HIRING ROCK CREATED",
  assign_person: "ASSIGN PERSON · OPENED",
  split_seat: "SPLIT SEAT · OPENED",
  delete_seat: "DELETE QUEUED",
}

export function HireModal() {
  const seatId = useOrgChartStore((s) => s.hireSeatId)
  const seat = useOrgChartStore((s) =>
    seatId ? s.seats.find((x) => x.id === seatId) : undefined,
  )
  const close = useOrgChartStore((s) => s.closeHire)
  const path = useOrgChartStore((s) => s.hirePath)
  const setPath = useOrgChartStore((s) => s.setHirePath)

  useEffect(() => {
    if (!seatId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [seatId, close])

  if (!seat) return null

  function onContinue() {
    toast(PATH_TOAST[path])
    close()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fill empty seat"
      className="fixed inset-0 z-[300] flex items-center justify-center p-10 bg-black/60 backdrop-blur-md"
      onClick={close}
    >
      <div
        className="glass-strong border border-gold-500 rounded-md shadow-gold-strong w-full max-w-[520px] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 pt-5 pb-4 border-b border-border-orage">
          <h2 className="font-display text-2xl tracking-[0.08em] text-gold-400">
            FILL EMPTY SEAT
          </h2>
          <p className="text-[12px] text-text-muted mt-1">
            {seat.title} ·{" "}
            {seat.vacantSinceDays
              ? `vacant ${seat.vacantSinceDays} days`
              : "newly opened"}
          </p>
        </header>
        <div className="px-6 py-5 flex flex-col gap-3.5">
          <p className="px-3 py-2.5 bg-bg-3 border-l-2 border-gold-500 rounded-r-sm text-[12px] text-text-secondary leading-relaxed">
            <strong className="text-gold-400">EOS principle: </strong>
            Don&apos;t change the seat to fit the person. Pick the path that
            best fills the role you&apos;ve already designed.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setPath(a.id)}
                className={cn(
                  "p-4 rounded-sm border-[1.5px] text-center transition-all",
                  path === a.id
                    ? "border-gold-500 bg-gold-500/[0.06]"
                    : "border-border-orage bg-bg-3 hover:border-gold-500 hover:-translate-y-0.5",
                )}
              >
                <span
                  className={cn(
                    "block w-10 h-10 rounded-sm border flex items-center justify-center text-base mx-auto mb-2 transition-colors",
                    path === a.id
                      ? "bg-gradient-to-br from-gold-500 to-gold-700 border-gold-500 text-text-on-gold"
                      : "bg-bg-2 border-border-orage text-gold-400",
                  )}
                >
                  {a.icon}
                </span>
                <span className="block font-display text-[11px] tracking-[0.15em] text-gold-400 mb-1">
                  {a.name}
                </span>
                <span className="block text-[10px] text-text-muted leading-snug">
                  {a.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
        <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border-orage">
          <button
            type="button"
            onClick={close}
            className="px-3.5 py-2 bg-bg-3 text-text-primary border border-border-orage rounded-sm text-[12px] hover:bg-bg-4 hover:border-gold-500 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="px-4 py-2 rounded-sm text-[12px] font-semibold text-text-on-gold transition-shadow hover:shadow-gold"
            style={{
              background:
                "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
              boxShadow: "0 2px 8px rgba(182,128,57,0.3)",
            }}
          >
            Continue
          </button>
        </footer>
      </div>
    </div>
  )
}
