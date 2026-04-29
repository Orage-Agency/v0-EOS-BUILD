"use client"

/**
 * Reset-to-Zero: the right rail shows real queue counts only.
 *
 * The "AI Pattern Detected" card and hardcoded delta sublines have
 * been removed — they will reappear once the AI Implementer surfaces
 * a real pattern from `ai_nudges` and `activity_log`.
 */

import { useIssuesStore } from "@/lib/issues-store"

function RailCard({
  title,
  hasOrb,
  children,
}: {
  title: string
  hasOrb?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="bg-bg-3 border border-border-orage rounded-sm overflow-hidden">
      <header className="px-3.5 py-3 border-b border-border-orage font-display text-[11px] tracking-[0.2em] text-gold-400 flex items-center gap-2">
        {hasOrb && (
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 30%, var(--gold-300), var(--gold-500), var(--gold-700))",
              boxShadow: "0 0 6px var(--gold-500)",
              animation: "ai-pulse 3s ease-in-out infinite",
            }}
            aria-hidden
          />
        )}
        {title}
      </header>
      <div className="px-3.5 py-3 flex flex-col gap-2.5">{children}</div>
    </section>
  )
}

function PinnedItem({
  num,
  title,
  onUnpin,
}: {
  num: number
  title: string
  onUnpin: () => void
}) {
  return (
    <div className="px-2.5 py-2 bg-bg-2 border-l-2 border-gold-500 rounded-r-sm flex items-center gap-2">
      <span className="font-display text-[13px] text-gold-400 min-w-[18px]">
        #{num}
      </span>
      <span className="text-[12px] text-text-secondary truncate flex-1">
        {title}
      </span>
      <button
        type="button"
        onClick={onUnpin}
        aria-label="Unpin"
        className="text-text-muted hover:text-gold-400 text-[14px] leading-none"
      >
        ×
      </button>
    </div>
  )
}

function KpiMini({
  value,
  label,
  hint,
}: {
  value: string
  label: string
  hint?: string
}) {
  return (
    <div className="px-2.5 py-2.5 bg-bg-2 rounded-sm flex items-center gap-2.5">
      <span className="font-display text-[22px] leading-none text-gold-400">
        {value}
      </span>
      <div>
        <div className="font-display text-[10px] tracking-[0.15em] text-text-muted">
          {label}
        </div>
        {hint && <div className="text-[10px] mt-0.5 text-text-muted">{hint}</div>}
      </div>
    </div>
  )
}

export function IssuesRightRail() {
  const issues = useIssuesStore((s) => s.issues)
  const togglePin = useIssuesStore((s) => s.togglePin)

  const openCount = issues.filter((i) => i.queue === "open").length
  const solvedCount = issues.filter((i) => i.queue === "solved").length
  const pinned = issues
    .filter((i) => i.pinnedForL10 && i.queue === "open")
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5)

  return (
    <aside className="flex flex-col gap-3.5">
      <RailCard title="THIS WEEK'S L10" hasOrb>
        <p className="text-[10px] font-mono text-text-muted">
          {pinned.length} PINNED · DRAG TO PIN MORE
        </p>
        {pinned.map((p) => (
          <PinnedItem
            key={p.id}
            num={p.rank}
            title={p.title}
            onUnpin={() => togglePin(p.id)}
          />
        ))}
        <div
          className="px-3.5 py-3 border border-dashed border-border-strong rounded-sm text-center text-[11px] text-text-muted hover:border-gold-500 hover:text-gold-400 hover:bg-[rgba(182,128,57,0.04)] transition-colors"
          aria-hidden
        >
          DRAG ISSUE HERE TO PIN FOR L10
        </div>
      </RailCard>

      <RailCard title="QUEUE HEALTH">
        <KpiMini value={String(openCount)} label="OPEN" />
        <KpiMini value={String(solvedCount)} label="SOLVED" />
        {openCount === 0 && solvedCount === 0 && (
          <p className="text-[11px] leading-relaxed text-text-muted px-1">
            Once issues land in the queue, throughput and aging stats
            appear here.
          </p>
        )}
      </RailCard>
    </aside>
  )
}
