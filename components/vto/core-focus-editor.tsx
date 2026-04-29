"use client"

import { useVTOStore } from "@/lib/vto-store"
import { FieldLabel } from "./section-shell"

export function CoreFocusEditor({ canEdit }: { canEdit: boolean }) {
  const purpose = useVTOStore((s) => s.purpose)
  const niche = useVTOStore((s) => s.niche)
  const setPurpose = useVTOStore((s) => s.setPurpose)
  const setNiche = useVTOStore((s) => s.setNiche)
  const markDirty = useVTOStore((s) => s.markDirty)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel meta="The why">PURPOSE / CAUSE / PASSION</FieldLabel>
        <textarea
          value={purpose}
          disabled={!canEdit}
          onChange={(e) => {
            setPurpose(e.target.value)
            markDirty()
          }}
          className="w-full bg-bg-2 border border-border-orage rounded-sm px-3 py-2.5 text-text-primary font-display text-lg tracking-[0.04em] leading-snug min-h-[60px] focus:border-gold-500 focus:bg-bg-3 transition-colors resize-y"
          rows={2}
        />
      </div>
      <div>
        <FieldLabel meta="The what + who">OUR NICHE</FieldLabel>
        <textarea
          value={niche}
          disabled={!canEdit}
          onChange={(e) => {
            setNiche(e.target.value)
            markDirty()
          }}
          className="w-full bg-bg-2 border border-border-orage rounded-sm px-3 py-2.5 text-text-primary text-[13px] leading-relaxed min-h-[80px] focus:border-gold-500 focus:bg-bg-3 transition-colors resize-y"
          rows={3}
        />
      </div>
    </div>
  )
}
