"use client"

/**
 * Reusable VTO section card — gold left border, header w/ AI button,
 * body slot. The "full" variant spans the 2-column grid.
 */

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function SectionShell({
  num,
  title,
  fullWidth,
  canAskAI,
  onAskAI,
  extraActions,
  children,
}: {
  num: number
  title: string
  fullWidth?: boolean
  canAskAI?: boolean
  onAskAI?: () => void
  extraActions?: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        "bg-bg-3 border border-border-orage rounded-md overflow-hidden flex flex-col",
        fullWidth && "col-span-2",
      )}
    >
      <header className="relative flex items-center justify-between px-5 py-4 bg-bg-2 border-b border-border-orage">
        <span
          aria-hidden
          className="absolute top-0 left-0 w-[3px] h-full bg-gold-500"
        />
        <h2 className="font-display text-base tracking-[0.18em] text-gold-400 uppercase flex items-center gap-2.5">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold text-text-on-gold font-display"
            style={{
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-700))",
            }}
          >
            {num}
          </span>
          {title}
        </h2>
        <div className="flex gap-1.5">
          {canAskAI && onAskAI ? (
            <button
              type="button"
              onClick={onAskAI}
              className="px-2.5 py-[5px] border border-gold-500 rounded-sm font-display text-[9px] tracking-[0.18em] text-gold-400 hover:bg-gold-500/15 transition-colors flex items-center gap-1.5"
            >
              <span aria-hidden className="text-[11px] leading-none">◆</span>
              ASK AI
            </button>
          ) : null}
          {extraActions}
        </div>
      </header>
      <div className="p-5 flex-1">{children}</div>
    </section>
  )
}

export function FieldLabel({
  children,
  meta,
}: {
  children: ReactNode
  meta?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between font-display text-[10px] tracking-[0.2em] text-gold-500 uppercase mb-1.5">
      <span>{children}</span>
      {meta ? (
        <span className="font-mono text-[9px] tracking-normal text-text-muted normal-case">
          {meta}
        </span>
      ) : null}
    </div>
  )
}

export function PermissionBanner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="mb-5 px-4 py-2.5 rounded-sm border flex items-center gap-2 text-[11px] text-warning bg-[rgba(212,162,74,0.06)] border-[rgba(212,162,74,0.25)]">
      <span aria-hidden>🔒</span>
      Founder-only edit. You can read &amp; comment but changes won&apos;t save.
    </div>
  )
}
