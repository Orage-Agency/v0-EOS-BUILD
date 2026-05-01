import { ListRowSkeleton, Skeleton } from "@/components/orage/skeleton"

export default function TasksLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-8 pt-6 flex items-start justify-between gap-5">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="px-8 mt-4">
        <div className="flex gap-2 border-b border-border-orage pb-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20" />
          ))}
        </div>
      </div>
      <div className="px-8 py-3 flex items-center gap-2 border-b border-border-orage">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24" />
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <ListRowSkeleton count={8} />
      </div>
    </div>
  )
}
