import { cn } from "@/lib/utils"

export function RankBadge({ rank }: { rank: number }) {
  const isTop3 = rank <= 3
  return (
    <span
      className={cn(
        "font-display text-[14px] tracking-[0.05em] text-center rounded-sm py-1 min-w-[30px] inline-block",
        isTop3
          ? "bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold font-bold"
          : "bg-bg-2 text-text-secondary",
      )}
      style={
        isTop3
          ? undefined
          : { background: "var(--bg-2)", color: "var(--text-secondary)" }
      }
    >
      {rank}
    </span>
  )
}
