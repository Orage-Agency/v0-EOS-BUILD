import { cn } from "@/lib/utils"
import type { MockUser } from "@/lib/mock-data"

type Size = "xs" | "sm" | "md" | "lg"

const SIZE_CLASS: Record<Size, string> = {
  xs: "avatar-xs",
  sm: "avatar-sm",
  md: "avatar-md",
  lg: "avatar-lg",
}

export function OrageAvatar({
  user,
  size = "sm",
  online = false,
  onClick,
  className,
  title,
  asButton,
}: {
  user: Pick<MockUser, "initials" | "color" | "name">
  size?: Size
  online?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
  title?: string
  asButton?: boolean
}) {
  const cls = cn(
    "avatar",
    SIZE_CLASS[size],
    user.color,
    online && "avatar-online",
    onClick && "cursor-pointer hover:scale-110 transition-transform",
    className,
  )
  if (asButton) {
    return (
      <button
        type="button"
        className={cls}
        onClick={onClick}
        title={title ?? user.name}
        aria-label={user.name}
      >
        {user.initials}
      </button>
    )
  }
  return (
    <span className={cls} onClick={onClick} title={title ?? user.name}>
      {user.initials}
    </span>
  )
}
