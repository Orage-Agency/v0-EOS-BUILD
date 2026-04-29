"use client"

import type { PerformanceSignal, PersonProfile } from "@/lib/people-store"
import { AIOrb } from "@/components/orage/ai-orb"
import { cn } from "@/lib/utils"

export function SignalsCard({ profile }: { profile: PersonProfile }) {
  return (
    <section className="glass rounded-md p-5">
      <header className="flex items-center gap-3 mb-5">
        <AIOrb size="sm" />
        <h3 className="font-display text-gold-400 text-sm tracking-[0.18em] uppercase flex-1">
          AI · Performance Signals
        </h3>
        <span className="text-[11px] text-text-muted font-mono">Updated 2h ago</span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {profile.signals.map((s) => (
          <SignalItem key={s.id} signal={s} />
        ))}
      </div>
    </section>
  )
}

function SignalItem({ signal }: { signal: PerformanceSignal }) {
  return (
    <div className="bg-bg-3 border border-border-orage rounded-sm p-3.5">
      <div className="font-display text-[10px] tracking-[0.18em] text-text-muted mb-2 uppercase">
        {signal.label}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="font-display text-text-primary text-2xl tracking-tight leading-none">
          {signal.value}
        </div>
        <div
          className={cn(
            "text-[10px] font-mono",
            signal.trend === "up" && "text-success",
            signal.trend === "down" && "text-danger",
            signal.trend === "flat" && "text-text-muted",
          )}
        >
          {signal.trendLabel}
        </div>
      </div>
      <div className="h-1 bg-bg-2 rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            signal.tone === "green" && "bg-success",
            signal.tone === "yellow" && "bg-warning",
            signal.tone === "red" && "bg-danger",
          )}
          style={{ width: `${signal.fillPct}%` }}
        />
      </div>
      <div className="text-[11px] text-text-muted leading-relaxed">{signal.context}</div>
    </div>
  )
}
