"use client"

import { useVTOStore } from "@/lib/vto-store"
import { FieldLabel } from "./section-shell"

export function ThreeYearPictureEditor({ canEdit }: { canEdit: boolean }) {
  const bigPicture = useVTOStore((s) => s.bigPicture)
  const measurables = useVTOStore((s) => s.threeYearMeasurables)
  const milestones = useVTOStore((s) => s.threeYearMilestones)

  const setBigPicture = useVTOStore((s) => s.setBigPicture)
  const updateMeasurable = useVTOStore((s) => s.updateThreeYearMeasurable)
  const updateMilestone = useVTOStore((s) => s.updateThreeYearMilestone)
  const addMilestone = useVTOStore((s) => s.addThreeYearMilestone)
  const removeMilestone = useVTOStore((s) => s.removeThreeYearMilestone)
  const markDirty = useVTOStore((s) => s.markDirty)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel>BIG PICTURE</FieldLabel>
        <textarea
          value={bigPicture}
          disabled={!canEdit}
          onChange={(e) => {
            setBigPicture(e.target.value)
            markDirty()
          }}
          rows={4}
          className="w-full bg-transparent border-0 text-gold-400 font-display text-lg tracking-[0.04em] leading-snug min-h-[80px] focus:outline-none resize-y"
        />
      </div>

      <div>
        <FieldLabel>MEASURABLES · 3 YEARS OUT</FieldLabel>
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
        <FieldLabel>KEY MILESTONES THE PICTURE INCLUDES</FieldLabel>
        <ul className="flex flex-col">
          {milestones.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-2 py-2 border-b border-border-orage last:border-b-0 group"
            >
              <span aria-hidden className="text-gold-500 leading-relaxed">
                ▸
              </span>
              <textarea
                value={m.text}
                disabled={!canEdit}
                onChange={(e) => {
                  updateMilestone(m.id, e.target.value)
                  markDirty()
                }}
                rows={1}
                className="flex-1 bg-transparent text-[13px] text-text-secondary leading-relaxed focus:outline-none resize-none"
              />
              {canEdit ? (
                <button
                  type="button"
                  aria-label="Remove milestone"
                  onClick={() => {
                    removeMilestone(m.id)
                    markDirty()
                  }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-sm flex items-center justify-center text-text-muted hover:bg-danger/15 hover:text-danger transition"
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              addMilestone()
              markDirty()
            }}
            className="mt-2 px-3 py-1.5 border border-dashed border-border-orage rounded-sm font-display text-[10px] tracking-[0.15em] text-text-muted hover:border-gold-500 hover:text-gold-400 transition-colors"
          >
            + ADD MILESTONE
          </button>
        ) : null}
      </div>
    </div>
  )
}
