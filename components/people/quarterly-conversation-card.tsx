"use client"

import type { PersonProfile } from "@/lib/people-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const FIELDS: {
  key: keyof Pick<
    PersonProfile["quarterlyConversation"],
    "workingNote" | "notWorkingNote" | "coreValuesNote" | "gwcReevalNote"
  >
  label: string
  placeholder: string
}[] = [
  {
    key: "workingNote",
    label: "WHAT'S WORKING",
    placeholder: "Captured during conversation. Open the doc to fill in.",
  },
  {
    key: "notWorkingNote",
    label: "WHAT'S NOT",
    placeholder: "Be specific. Examples + impact.",
  },
  {
    key: "coreValuesNote",
    label: "CORE VALUES CHECK",
    placeholder: "Hits: ___ / 5 · Examples per value.",
  },
  {
    key: "gwcReevalNote",
    label: "GWC RE-EVAL",
    placeholder: "Did anything shift? G / W / C still all yes?",
  },
]

export function QuarterlyConversationCard({
  profile,
}: {
  profile: PersonProfile
}) {
  const qc = profile.quarterlyConversation

  return (
    <section
      className={cn(
        "rounded-md p-5 border",
        qc.dueThisWeek
          ? "bg-gradient-to-br from-[rgba(212,162,74,0.06)] to-transparent border-warning/40 shadow-[0_0_30px_rgba(212,162,74,0.08)]"
          : "glass",
      )}
    >
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-display text-gold-400 text-sm tracking-[0.18em] uppercase">
          Quarterly Conversation · {qc.quarter}
        </h3>
        {qc.dueThisWeek && (
          <span className="font-display text-[10px] tracking-[0.18em] uppercase text-warning inline-flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse"
              style={{ boxShadow: "0 0 6px var(--warning)" }}
            />
            DUE THIS WEEK
          </span>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {FIELDS.map((f) => (
          <div
            key={f.key}
            className="bg-bg-3 border border-border-orage rounded-sm p-3"
          >
            <div className="font-display text-[10px] tracking-[0.18em] text-gold-500 mb-1.5 uppercase">
              {f.label}
            </div>
            <div className="text-xs text-text-muted italic leading-relaxed">
              {qc[f.key] ?? f.placeholder}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => toast("CONVERSATION DOC OPENED")}
        className="h-9 px-4 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm transition-colors"
      >
        Start Conversation
      </button>
    </section>
  )
}
