"use client"

import { usePeopleStore, type GWCAnswer, type PersonProfile } from "@/lib/people-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const ITEMS: { key: "g" | "w" | "c"; letter: string; question: string }[] = [
  { key: "g", letter: "G", question: "GET IT" },
  { key: "w", letter: "W", question: "WANT IT" },
  { key: "c", letter: "C", question: "CAPACITY" },
]

export function GWCCard({ profile }: { profile: PersonProfile }) {
  const cycleGWC = usePeopleStore((s) => s.cycleGWC)

  return (
    <section className="glass rounded-md p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-display text-gold-400 text-sm tracking-[0.18em] uppercase">
          GWC · Last Quarterly
        </h3>
        <span className="text-[11px] text-text-muted font-mono uppercase">
          {profile.gwc.quarter} · {profile.gwc.capturedAt}
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {ITEMS.map((it) => {
          const item = profile.gwc[it.key]
          return (
            <button
              key={it.key}
              onClick={() => {
                cycleGWC(profile.userId, it.key)
                toast("GWC UPDATED")
              }}
              className={cn(
                "text-left bg-bg-3 border-2 rounded-sm p-4 transition-colors hover:border-gold-500",
                item.answer === "yes" && "border-success/40",
                item.answer === "no" && "border-danger/40",
                item.answer === "pending" && "border-border-orage",
              )}
            >
              <GWCLetter letter={it.letter} answer={item.answer} />
              <div className="font-display text-text-primary text-sm tracking-[0.15em] mt-3 mb-1.5 uppercase">
                {it.question}
              </div>
              <div className="text-xs text-text-secondary leading-relaxed">
                {item.note ?? <span className="text-text-muted italic">No note yet.</span>}
              </div>
            </button>
          )
        })}
      </div>

      {profile.gwc.trend && (
        <div className="text-xs text-text-secondary leading-relaxed bg-bg-3 border border-border-orage rounded-sm p-3">
          <span className="text-text-muted">Trend: </span>
          <strong className="text-text-primary">{profile.gwc.trend}</strong>
        </div>
      )}
    </section>
  )
}

function GWCLetter({ letter, answer }: { letter: string; answer: GWCAnswer }) {
  const cls =
    answer === "yes"
      ? "bg-success/20 text-success border-success/40"
      : answer === "no"
        ? "bg-danger/20 text-danger border-danger/40"
        : "bg-bg-active text-text-muted border-border-orage"
  return (
    <span
      className={cn(
        "w-12 h-12 rounded-sm border-2 font-display text-2xl flex items-center justify-center tracking-tight",
        cls,
      )}
    >
      {answer === "pending" ? "?" : letter}
    </span>
  )
}
