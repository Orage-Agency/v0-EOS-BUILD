"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useVTOStore, type Goal } from "@/lib/vto-store"
import { FieldLabel } from "./section-shell"

const STATUS_LABEL: Record<Goal["status"], string> = {
  on_track: "ON TRACK",
  at_risk: "AT RISK",
  off_track: "OFF TRACK",
}

const STATUS_CLS: Record<Goal["status"], string> = {
  on_track: "bg-success/15 text-success",
  at_risk: "bg-warning/15 text-warning",
  off_track: "bg-danger/15 text-danger",
}

export function OneYearPlanEditor({ canEdit }: { canEdit: boolean }) {
  const oneYearDate = useVTOStore((s) => s.oneYearDate)
  const measurables = useVTOStore((s) => s.oneYearMeasurables)
  const goals = useVTOStore((s) => s.goals)

  const setOneYearDate = useVTOStore((s) => s.setOneYearDate)
  const updateMeasurable = useVTOStore((s) => s.updateOneYearMeasurable)
  const updateGoal = useVTOStore((s) => s.updateGoal)
  const cycleGoalStatus = useVTOStore((s) => s.cycleGoalStatus)
  const addGoal = useVTOStore((s) => s.addGoal)
  const removeGoal = useVTOStore((s) => s.removeGoal)
  const markDirty = useVTOStore((s) => s.markDirty)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel>FUTURE DATE</FieldLabel>
        <input
          value={oneYearDate}
          disabled={!canEdit}
          onChange={(e) => {
            setOneYearDate(e.target.value)
            markDirty()
          }}
          className="max-w-[240px] bg-bg-2 border border-border-orage rounded-sm px-3 py-2 text-[13px] text-text-primary focus:border-gold-500 focus:bg-bg-3 transition-colors"
        />
      </div>

      <div>
        <FieldLabel>MEASURABLES · NEXT 12 MONTHS</FieldLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {measurables.map((m) => (
            <div
              key={m.id}
              className="bg-bg-2 border border-border-orage rounded-sm py-3 px-3.5 text-center"
            >
              <div className="font-display text-[9px] tracking-[0.18em] text-text-muted mb-1.5">
                {m.label}
              </div>
              <input
                value={m.value}
                disabled={!canEdit}
                onChange={(e) => {
                  updateMeasurable(m.id, e.target.value)
                  markDirty()
                }}
                className="w-full bg-transparent text-center font-display text-2xl text-gold-400 tracking-[0.04em] leading-none focus:outline-none"
              />
              <div className="text-[10px] text-text-muted mt-1 font-mono">
                {m.meta}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel meta="→ Each becomes a parent for quarterly Rocks">
          GOALS · 3-7 SPECIFIC
        </FieldLabel>
        <ul className="flex flex-col gap-2">
          {goals.map((g, idx) => (
            <li
              key={g.id}
              className="grid grid-cols-[30px_1fr_84px_72px_24px] gap-2.5 items-center px-3.5 py-2.5 bg-bg-2 border border-border-orage border-l-2 border-l-gold-500 rounded-sm hover:border-border-strong transition-colors group"
            >
              <span className="font-display text-sm text-gold-400 text-center">
                {idx + 1}
              </span>
              <input
                value={g.text}
                disabled={!canEdit}
                onChange={(e) => {
                  updateGoal(g.id, e.target.value)
                  markDirty()
                }}
                className="bg-transparent text-[13px] text-text-primary focus:outline-none"
              />
              <Link
                href={`/rocks?goal=${g.id}`}
                className="text-[9px] text-gold-500 font-display tracking-[0.15em] text-center bg-gold-500/10 hover:bg-gold-500/25 px-2 py-1 rounded-sm transition-colors"
                onClick={() => toast(`OPENING ${g.rocksLinked} LINKED ROCKS`)}
              >
                ↗ {g.rocksLinked} {g.rocksLinked === 1 ? "ROCK" : "ROCKS"}
              </Link>
              <button
                type="button"
                onClick={() => {
                  cycleGoalStatus(g.id)
                  markDirty()
                  toast("STATUS UPDATED")
                }}
                disabled={!canEdit}
                className={cn(
                  "font-display text-[9px] tracking-[0.15em] px-2 py-1 rounded-sm text-center cursor-pointer transition-opacity hover:opacity-80",
                  STATUS_CLS[g.status],
                )}
              >
                {STATUS_LABEL[g.status]}
              </button>
              {canEdit ? (
                <button
                  type="button"
                  aria-label="Remove goal"
                  onClick={() => {
                    removeGoal(g.id)
                    markDirty()
                    toast("GOAL REMOVED")
                  }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-sm flex items-center justify-center text-text-muted hover:bg-danger/15 hover:text-danger transition"
                >
                  ×
                </button>
              ) : (
                <span aria-hidden />
              )}
            </li>
          ))}
        </ul>
        {canEdit && goals.length < 7 ? (
          <button
            type="button"
            onClick={() => {
              addGoal()
              markDirty()
            }}
            className="mt-2 px-3 py-2 w-full flex items-center justify-center gap-1.5 border border-dashed border-border-orage rounded-sm text-text-muted font-display text-[10px] tracking-[0.15em] hover:border-gold-500 hover:text-gold-400 hover:bg-gold-500/5 transition-colors"
          >
            + ADD GOAL
          </button>
        ) : null}
      </div>
    </div>
  )
}
