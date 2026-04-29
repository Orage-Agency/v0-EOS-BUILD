import { cn } from "@/lib/utils"

export function AIOrb({
  size = "md",
  className,
}: {
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}) {
  const dims = {
    xs: "w-2.5 h-2.5",
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-6 h-6",
  }[size]
  return (
    <span aria-hidden className={cn("ai-orb shrink-0", dims, className)} />
  )
}
