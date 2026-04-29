"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TenantSwitcher } from "./tenant-switcher"
import { AILauncher } from "./ai-launcher"
import { UserBar } from "./user-bar"
import { CURRENT_USER } from "@/lib/mock-data"
import { can } from "@/lib/permissions"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import {
  IcAdmin,
  IcDashboard,
  IcIssue,
  IcL10,
  IcNote,
  IcOrgChart,
  IcPeople,
  IcRock,
  IcScorecard,
  IcSettings,
  IcSpark,
  IcTask,
  IcVTO,
} from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import type { ComponentType, SVGProps } from "react"

type NavItem = {
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  badge?: string
  badgeKind?: "gold" | "count"
  masterOnly?: boolean
  matchPrefix?: boolean
}

// Reset-to-Zero: counts are derived in `useNavCounts()` below, not hard-coded,
// so an empty workspace shows no badges (and lying numbers don't appear).
const WORKSPACE: NavItem[] = [
  { href: "/", label: "Dashboard", icon: IcDashboard },
  { href: "/rocks", label: "Rocks", icon: IcRock, matchPrefix: true },
  { href: "/notes", label: "Notes", icon: IcNote, matchPrefix: true },
  { href: "/tasks", label: "Tasks", icon: IcTask, matchPrefix: true },
  { href: "/issues", label: "Issues", icon: IcIssue },
  { href: "/scorecard", label: "Scorecard", icon: IcScorecard },
  { href: "/l10", label: "L10 Meeting", icon: IcL10 },
]

const VISION: NavItem[] = [
  { href: "/vto", label: "V/TO", icon: IcVTO },
  { href: "/orgchart", label: "Accountability Chart", icon: IcOrgChart },
  { href: "/people", label: "People", icon: IcPeople },
  { href: "/ai", label: "AI Implementer", icon: IcSpark, matchPrefix: true },
]

const ADMIN: NavItem[] = [
  { href: "/admin", label: "Bird's Eye View", icon: IcAdmin, masterOnly: true },
  { href: "/help", label: "Help & Manual", icon: IcHelp },
  { href: "/settings", label: "Settings", icon: IcSettings },
]

/**
 * Question-mark icon for the Help nav row. Inlined here so the existing
 * `@/components/orage/icons` module isn't churned for a single new glyph.
 */
function IcHelp(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.4a2.6 2.6 0 0 1 5.2 0c0 1.4-.9 2-1.9 2.6-.7.4-1.2.8-1.2 1.7" />
      <circle cx="12" cy="17.2" r="0.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function NavRow({
  item,
  active,
  locked,
  workspaceSlug,
}: {
  item: NavItem
  active: boolean
  locked?: boolean
  workspaceSlug: string
}) {
  const Icon = item.icon
  const href =
    item.href === "/"
      ? `/${workspaceSlug}`
      : `/${workspaceSlug}${item.href}`
  const inner = (
    <>
      <Icon className="w-4 h-4 shrink-0 opacity-85 group-[.active]:opacity-100" />
      <span className="flex-1 truncate">{item.label}</span>
      {locked ? (
        <span className="text-[10px] opacity-60" aria-hidden>
          🔒
        </span>
      ) : item.badge ? (
        item.badgeKind === "gold" ? (
          <span className="ml-auto text-[10px] px-1.5 py-px bg-gold-500 text-text-on-gold rounded-pill font-bold">
            {item.badge}
          </span>
        ) : (
          <span className="ml-auto text-[10px] text-text-muted font-mono">
            {item.badge}
          </span>
        )
      ) : null}
    </>
  )
  const cls = cn(
    "group flex items-center gap-3 px-4 py-2 text-[13px] border-l-2 transition-all",
    active
      ? "active bg-bg-active text-gold-400 border-gold-500"
      : "border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary",
    locked && "opacity-40 cursor-not-allowed pointer-events-none",
  )
  if (locked) {
    return (
      <div className={cls} aria-disabled>
        {inner}
      </div>
    )
  }
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  )
}

function NavGroup({
  label,
  items,
  pathname,
  workspaceSlug,
  masterOnly,
}: {
  label: string
  items: NavItem[]
  pathname: string
  workspaceSlug: string
  masterOnly?: boolean
}) {
  if (masterOnly && !CURRENT_USER.isMaster) return null
  const visible = items.filter((i) => !i.masterOnly || CURRENT_USER.isMaster)
  if (visible.length === 0) return null
  return (
    <>
      <div className="font-display text-[10px] tracking-[0.25em] text-gold-500 px-4 pt-3.5 pb-1.5 uppercase">
        {label}
      </div>
      {visible.map((item) => {
        const fullHref =
          item.href === "/"
            ? `/${workspaceSlug}`
            : `/${workspaceSlug}${item.href}`
        const active = item.matchPrefix
          ? item.href !== "/" &&
            (pathname === fullHref || pathname.startsWith(fullHref + "/"))
          : pathname === fullHref
        return (
          <NavRow
            key={item.href}
            item={item}
            active={active}
            workspaceSlug={workspaceSlug}
          />
        )
      })}
    </>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const workspaceSlug = useWorkspaceSlug()
  // Permissions are referenced here in case a future nav row needs to gate.
  void can

  return (
    <aside className="bg-bg-1 border-r border-border-orage flex flex-col overflow-hidden relative">
      <div className="border-b border-border-orage flex items-center gap-2.5 px-[18px] pt-[18px] pb-3.5">
        <span
          className="w-[30px] h-[30px] rounded-sm flex items-center justify-center font-display text-[18px] font-bold text-text-on-gold shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
            boxShadow: "0 2px 8px rgba(182,128,57,0.3)",
          }}
        >
          O
        </span>
        <span className="font-display text-[18px] tracking-[0.18em] text-gold-400 leading-none">
          ORAGE
          <span className="block text-[9px] tracking-[0.3em] text-text-muted mt-0.5">
            CORE
          </span>
        </span>
      </div>

      <TenantSwitcher />

      <nav className="flex-1 overflow-y-auto py-2">
        <NavGroup
          label="Workspace"
          items={WORKSPACE}
          pathname={pathname}
          workspaceSlug={workspaceSlug}
        />
        <NavGroup
          label="Vision"
          items={VISION}
          pathname={pathname}
          workspaceSlug={workspaceSlug}
        />
        <NavGroup
          label="Admin"
          items={ADMIN}
          pathname={pathname}
          workspaceSlug={workspaceSlug}
          masterOnly
        />
      </nav>

      <AILauncher />
      <UserBar />
    </aside>
  )
}
