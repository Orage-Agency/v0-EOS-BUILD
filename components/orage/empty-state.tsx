import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Standardized empty-state cell. Use for any list/grid/table that's
 * legitimately empty — not loading, not error, just no data yet.
 *
 *   <EmptyState
 *     icon="●"
 *     title="No rocks yet"
 *     body="Quarterly priorities live here. Pick the 3-7 most important things you'll ship in the next 90 days."
 *     action={<Link href="/rocks?new=1">+ Create your first rock</Link>}
 *   />
 *
 * Variants:
 * - "card": full-card empty state with border + padding (default)
 * - "inline": tighter, no border — for use inside an existing card
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  variant = "card",
  className,
}: {
  icon?: ReactNode
  title: string
  body?: ReactNode
  action?: ReactNode
  variant?: "card" | "inline"
  className?: string
}) {
  return (
    <div
      className={cn(
        variant === "card" &&
          "rounded-md border border-dashed border-border-orage bg-bg-3/30 px-6 py-10 text-center",
        variant === "inline" && "px-4 py-6 text-center",
        className,
      )}
    >
      {icon && (
        <div
          className="mx-auto mb-3 w-10 h-10 rounded-full bg-bg-3 border border-border-orage flex items-center justify-center text-gold-500 text-base"
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h3 className="font-display text-[13px] tracking-[0.18em] uppercase text-text-primary">
        {title}
      </h3>
      {body && (
        <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted max-w-md mx-auto">
          {body}
        </p>
      )}
      {action && <div className="mt-4 flex items-center justify-center gap-2">{action}</div>}
    </div>
  )
}
