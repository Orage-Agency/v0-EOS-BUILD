"use client"

/**
 * Reset-to-Zero: insights are derived from real scorecard data.
 *
 * Until the AI engine has enough trailing weeks to surface a pattern,
 * and until the team logs at least one win worth celebrating, this
 * panel shows a brand-aligned empty state instead of fabricated
 * "WEEK 17" copy. Real insights and celebrations land here once the
 * AI Implementer detects them in `ai_nudges` / `activity_log`.
 */

import { AIOrb } from "@/components/orage/ai-orb"

function Card({
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
        {hasOrb ? <AIOrb size="sm" /> : null}
        {title}
      </header>
      <div className="px-3.5 py-5">{children}</div>
    </section>
  )
}

function EmptyBlock({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-display text-[9px] tracking-[0.22em] text-text-muted uppercase">
        {eyebrow}
      </span>
      <p className="text-[12px] leading-relaxed text-text-secondary">
        <strong className="text-gold-400">{title}</strong> {description}
      </p>
    </div>
  )
}

export function InsightsPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-6">
      <Card title="AI · PATTERNS DETECTED" hasOrb>
        <EmptyBlock
          eyebrow="No patterns yet"
          title="The implementer is still listening."
          description="As soon as a metric posts two consecutive reds — or two adjacent metrics break together — a pattern lands here with a one-click rock proposal."
        />
      </Card>

      <Card title="CELEBRATIONS">
        <EmptyBlock
          eyebrow="No celebrations yet"
          title="Wins will surface automatically."
          description="Streaks, records, and goal beats bubble up here once trailing scorecard data, completed rocks, and solved issues clear our thresholds."
        />
      </Card>
    </div>
  )
}
