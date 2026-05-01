import { Skeleton } from "@/components/orage/skeleton"

export default function RocksLoading() {
  return (
    <div className="pb-12">
      <div className="px-8 pt-6 flex items-start justify-between gap-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-56" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-3 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="px-8 mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="px-8 mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border-orage bg-bg-2 min-h-[480px] p-3 space-y-2.5">
            <Skeleton className="h-8 w-32" />
            {Array.from({ length: 2 }).map((_, j) => (
              <Skeleton key={j} className="h-32 w-full rounded-md" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
