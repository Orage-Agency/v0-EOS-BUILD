"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { usePathname, useParams } from "next/navigation"
import { useUIStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { ComponentType, SVGProps } from "react"

type IconProps = SVGProps<SVGSVGElement>

function IconBase({ children, ...p }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      {children}
    </svg>
  )
}

const IcGeneral = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6v6H9z" />
  </IconBase>
)
const IcMembers = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </IconBase>
)
const IcIntegrations = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </IconBase>
)
const IcAI = (p: IconProps) => (
  <IconBase {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08 4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08 4.24-4.24" />
  </IconBase>
)
const IcSecurity = (p: IconProps) => (
  <IconBase {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </IconBase>
)
const IcBell = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </IconBase>
)
const IcStar = (p: IconProps) => (
  <IconBase {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </IconBase>
)
const IcDanger = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </IconBase>
)
const IcAudit = (p: IconProps) => (
  <IconBase {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </IconBase>
)

type NavItem = {
  href: string
  label: string
  icon: ComponentType<IconProps>
  hint?: string
  hintColor?: string
  /** Visibility gates */
  founderOnly?: boolean
  masterOnly?: boolean
  danger?: boolean
  master?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
  masterOnly?: boolean
}

const GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/settings/workspace", label: "General", icon: IcGeneral },
      {
        href: "/settings/members",
        label: "Members",
        icon: IcMembers,
        hint: "4",
        hintColor: "text-text-muted",
      },
      {
        href: "/settings/integrations",
        label: "Integrations",
        icon: IcIntegrations,
        hint: "3 ON",
        hintColor: "text-success",
      },
      {
        href: "/settings/ai",
        label: "AI Implementer",
        icon: IcAI,
        founderOnly: true,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        href: "/settings/security",
        label: "Security & API",
        icon: IcSecurity,
      },
      {
        href: "/settings/notifications",
        label: "Notifications",
        icon: IcBell,
      },
      {
        href: "/settings/audit",
        label: "Audit log",
        icon: IcAudit,
      },
    ],
  },
  {
    label: "Master",
    masterOnly: true,
    items: [
      {
        href: "/settings/master-system",
        label: "System Config",
        icon: IcStar,
        masterOnly: true,
        master: true,
      },
    ],
  },
]

const DANGER_ITEM: NavItem = {
  href: "/settings/danger",
  label: "Danger Zone",
  icon: IcDanger,
  founderOnly: true,
  danger: true,
}

export function SettingsNav() {
  const pathname = usePathname()
  const params = useParams()
  const workspaceSlug = (params?.workspace as string) ?? "orage"
  const sessionUser = useUIStore((s) => s.currentUser)
  const isMaster = sessionUser?.isMaster ?? false
  const isFounder = sessionUser?.role === "founder"

  function shouldShow(item: NavItem) {
    if (item.masterOnly && !isMaster) return false
    if (item.founderOnly && !isFounder && !isMaster) return false
    return true
  }

  function isActive(href: string): boolean {
    const full = `/${workspaceSlug}${href}`
    return pathname === full || pathname.startsWith(full + "/")
  }

  return (
    <aside className="sticky top-6 self-start bg-bg-3 border border-border-orage rounded-md overflow-hidden">
      {GROUPS.map((group) => {
        if (group.masterOnly && !isMaster) return null
        const visible = group.items.filter(shouldShow)
        if (!visible.length) return null
        return (
          <div key={group.label} className="py-2">
            <div className="font-display text-[9px] tracking-[0.22em] text-text-muted px-4 pt-2.5 pb-1.5 uppercase">
              {group.label}
            </div>
            {visible.map((item) => (
              <NavRow key={item.href} item={item} active={isActive(item.href)} />
            ))}
            <div className="h-px bg-border-orage mx-0 mt-1.5" />
          </div>
        )
      })}
      {shouldShow(DANGER_ITEM) && (
        <div className="py-2">
          <NavRow item={DANGER_ITEM} active={isActive(DANGER_ITEM.href)} />
        </div>
      )}
    </aside>
  )
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-4 py-2.5 text-xs border-l-2 transition-all",
        active
          ? "bg-bg-active border-gold-500 text-gold-400"
          : "border-transparent text-text-secondary hover:bg-bg-hover",
        item.danger && !active && "text-danger hover:text-danger",
        item.master && !active && "text-gold-400",
      )}
    >
      <Icon className={cn("w-3.5 h-3.5 shrink-0", active ? "opacity-100" : "opacity-70")} />
      <span className="flex-1">{item.label}</span>
      {item.hint && (
        <span className={cn("text-[10px] font-mono", item.hintColor ?? "text-text-muted")}>
          {item.hint}
        </span>
      )}
    </Link>
  )
}
