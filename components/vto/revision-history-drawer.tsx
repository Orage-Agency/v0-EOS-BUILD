"use client"

import { useEffect } from "react"
import { useVTOStore } from "@/lib/vto-store"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { IcClose } from "@/components/orage/icons"

export function RevisionHistoryDrawer() {
  const open = useVTOStore((s) => s.revisionsOpen)
  const close = useVTOStore((s) => s.closeRevisions)
  const revisions = useVTOStore((s) => s.revisions)
  const restore = useVTOStore((s) => s.restoreRevision)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, close])

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[200] bg-black/50 backdrop-blur-md transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={close}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="V/TO revision history"
        className={cn(
          "fixed right-0 top-0 h-screen w-[400px] max-w-[90vw] z-[201] glass-strong border-l border-gold-500 flex flex-col shadow-orage-lg transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-border-orage">
          <h2 className="font-display text-sm tracking-[0.2em] text-gold-400">
            REVISION HISTORY · {revisions.length}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close revisions"
            className="w-7 h-7 rounded-sm flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-gold-400 transition-colors"
          >
            <IcClose className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <ul className="flex flex-col gap-2">
            {revisions.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "p-3.5 bg-bg-3 border rounded-sm cursor-pointer transition-colors",
                  r.isCurrent
                    ? "border-gold-500 bg-gold-500/[0.06]"
                    : "border-border-orage hover:border-gold-500",
                )}
                onClick={() => {
                  if (r.isCurrent) return
                  restore(r.id)
                  toast(`RESTORED · REV ${r.rev}`)
                }}
              >
                <div className="flex items-center justify-between font-display text-[10px] tracking-[0.15em] text-text-muted mb-1.5">
                  <span>
                    REV <span className="text-gold-400">{r.rev}</span>
                    {r.isCurrent ? (
                      <span className="ml-2 text-gold-400">· CURRENT</span>
                    ) : null}
                  </span>
                  <span className="text-text-muted">
                    {r.at} · <span className="text-gold-400">{r.authorLabel}</span>
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  {r.summary}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </>
  )
}
