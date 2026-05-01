import { CardSkeleton, Skeleton } from "@/components/orage/skeleton"

export default function PeopleLoading() {
  return (
    <main className="px-8 py-6 max-w-[1400px] mx-auto">
      <header className="flex items-end justify-between gap-4 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </header>
      <div className="flex gap-2 mb-5">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-28" />
      </div>
      <CardSkeleton count={3} />
    </main>
  )
}
