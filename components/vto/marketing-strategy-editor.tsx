"use client"

import { useVTOStore } from "@/lib/vto-store"
import { FieldLabel } from "./section-shell"

export function MarketingStrategyEditor({ canEdit }: { canEdit: boolean }) {
  const targetMarket = useVTOStore((s) => s.targetMarket)
  const uniques = useVTOStore((s) => s.uniques)
  const provenProcess = useVTOStore((s) => s.provenProcess)
  const guarantee = useVTOStore((s) => s.guarantee)

  const setTargetMarket = useVTOStore((s) => s.setTargetMarket)
  const updateUnique = useVTOStore((s) => s.updateUnique)
  const setProvenProcess = useVTOStore((s) => s.setProvenProcess)
  const setGuarantee = useVTOStore((s) => s.setGuarantee)
  const markDirty = useVTOStore((s) => s.markDirty)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel>TARGET MARKET · &ldquo;THE LIST&rdquo;</FieldLabel>
        <textarea
          value={targetMarket}
          disabled={!canEdit}
          onChange={(e) => {
            setTargetMarket(e.target.value)
            markDirty()
          }}
          className="w-full bg-bg-2 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary leading-relaxed min-h-[80px] focus:border-gold-500 focus:bg-bg-3 transition-colors resize-y"
          rows={4}
        />
      </div>

      <div>
        <FieldLabel>THREE UNIQUES</FieldLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {uniques.map((u, i) => (
            <div
              key={u.id}
              className="bg-bg-2 border border-border-orage rounded-sm p-3.5 hover:border-border-strong transition-colors"
            >
              <span className="font-display text-xl text-gold-500 leading-none mb-1.5 block">
                {i + 1}
              </span>
              <textarea
                value={u.text}
                disabled={!canEdit}
                onChange={(e) => {
                  updateUnique(u.id, e.target.value)
                  markDirty()
                }}
                rows={3}
                className="w-full bg-transparent text-[12px] text-text-primary leading-snug min-h-[60px] focus:outline-none resize-none"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>PROVEN PROCESS</FieldLabel>
        <textarea
          value={provenProcess}
          disabled={!canEdit}
          onChange={(e) => {
            setProvenProcess(e.target.value)
            markDirty()
          }}
          rows={3}
          className="w-full bg-bg-2 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary leading-relaxed focus:border-gold-500 focus:bg-bg-3 transition-colors resize-y"
        />
      </div>

      <div>
        <FieldLabel>GUARANTEE</FieldLabel>
        <textarea
          value={guarantee}
          disabled={!canEdit}
          onChange={(e) => {
            setGuarantee(e.target.value)
            markDirty()
          }}
          rows={2}
          className="w-full bg-bg-2 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary leading-relaxed focus:border-gold-500 focus:bg-bg-3 transition-colors resize-y"
        />
      </div>
    </div>
  )
}
