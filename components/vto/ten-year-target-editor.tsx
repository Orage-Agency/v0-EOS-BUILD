"use client"

import { useVTOStore } from "@/lib/vto-store"

export function TenYearTargetEditor({ canEdit }: { canEdit: boolean }) {
  const tenYearTarget = useVTOStore((s) => s.tenYearTarget)
  const setTenYearTarget = useVTOStore((s) => s.setTenYearTarget)
  const markDirty = useVTOStore((s) => s.markDirty)

  return (
    <div>
      <textarea
        value={tenYearTarget}
        disabled={!canEdit}
        onChange={(e) => {
          setTenYearTarget(e.target.value)
          markDirty()
        }}
        rows={2}
        className="w-full bg-bg-2 border border-border-orage rounded-sm px-3 py-3 text-gold-400 font-display text-2xl tracking-[0.05em] leading-tight min-h-[68px] focus:border-gold-500 focus:bg-bg-3 transition-colors resize-y"
      />
      <div
        className="mt-3.5 px-3 py-2.5 rounded-r-sm border-l-2 border-info bg-bg-2 text-[11px] text-text-muted leading-relaxed"
        role="note"
      >
        <strong className="block font-display tracking-[0.15em] text-info text-[10px] mb-1">
          EOS RULE
        </strong>
        One sentence. Specific. Audacious. Time-bound. Everyone on the team can
        recite it.
      </div>
    </div>
  )
}
