import { cn } from "@/lib/utils"

/**
 * Single skeleton block — animated shimmer line for loading states.
 * Composed into row/card skeletons by feature components.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-bg-3 via-bg-active to-bg-3 bg-[length:200%_100%] rounded-sm",
        className,
      )}
      style={{ animation: "skeleton-shimmer 1.4s linear infinite" }}
    />
  )
}

/** A row skeleton sized like a TaskRow / IssueRow — use to fill list views during load. */
export function ListRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-px">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4.5 py-3 border-b border-border-orage">
          <Skeleton className="w-3.5 h-3.5" />
          <Skeleton className="h-3.5 flex-1 max-w-[60%]" />
          <Skeleton className="h-3.5 w-14" />
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="rounded-full w-6 h-6" />
        </div>
      ))}
    </div>
  )
}

/** Card skeleton sized like a RockCard / PersonCard. */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 rounded-md bg-bg-3 border border-border-orage flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Skeleton className="rounded-full w-12 h-12" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border-orage">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        </div>
      ))}
    </div>
  )
}
