import type { AIUsageSummary } from "@/app/actions/ai-settings"
import { SectionBlock, SCard } from "./ui"

/**
 * Minimal-but-honest AI usage panel. Renders the trailing-30-day
 * tokens (in + out) and message count so admins can see what their
 * implementer is actually using. Per-day series is shown as a tiny
 * sparkline of message counts — gives a quick read on "are we using
 * this today?" without dragging in a chart library.
 *
 * The data is whatever lives in ai_chat_messages; no third-party
 * observability dependency.
 */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function dayRange(): string[] {
  const out: string[] = []
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export function AIUsageCard({ usage }: { usage: AIUsageSummary }) {
  const days = dayRange()
  const peakMessages = days.reduce(
    (max, d) => Math.max(max, usage.byDay[d]?.messages ?? 0),
    0,
  )

  return (
    <SectionBlock
      title="AI USAGE"
      description="Trailing 30 days · token consumption + message volume across the workspace"
    >
      <SCard title="LAST 30 DAYS">
        <div className="grid grid-cols-3 gap-4 mb-5">
          <Stat
            label="Messages"
            value={formatNumber(usage.totalMessages)}
            hint={
              usage.totalMessages === 0
                ? "No turns yet"
                : `${(usage.totalMessages / 30).toFixed(1)}/day avg`
            }
          />
          <Stat
            label="Tokens in"
            value={formatNumber(usage.totalTokensIn)}
            hint="Prompt + context"
          />
          <Stat
            label="Tokens out"
            value={formatNumber(usage.totalTokensOut)}
            hint="Model output"
          />
        </div>

        <div className="font-display tracking-[0.18em] text-[10px] text-text-muted mb-1.5">
          MESSAGES · DAILY
        </div>
        <div className="flex items-end gap-[2px] h-12">
          {days.map((d) => {
            const count = usage.byDay[d]?.messages ?? 0
            const height = peakMessages > 0 ? (count / peakMessages) * 100 : 0
            return (
              <div
                key={d}
                className="flex-1 bg-bg-3 border border-border-orage rounded-[1px] relative"
                title={`${d}: ${count} message${count === 1 ? "" : "s"}`}
              >
                {height > 0 && (
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gold-500/60 rounded-[1px]"
                    style={{ height: `${Math.max(height, 6)}%` }}
                  />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[9px] font-mono text-text-dim">
          <span>{days[0]}</span>
          <span>today</span>
        </div>

        {usage.totalMessages === 0 && (
          <p className="text-[11px] text-text-muted mt-4 leading-relaxed">
            Nothing logged in the last 30 days. Token counts populate
            automatically as the implementer is used.
          </p>
        )}
      </SCard>
    </SectionBlock>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div>
      <div className="font-display tracking-[0.18em] text-[10px] text-text-muted mb-1">
        {label.toUpperCase()}
      </div>
      <div
        className="text-[28px] leading-none text-gold-400"
        style={{ fontFamily: "Bebas Neue", letterSpacing: "0.04em" }}
      >
        {value}
      </div>
      <div className="text-[10px] font-mono text-text-muted mt-1">{hint}</div>
    </div>
  )
}
