"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  IcDashboard,
  IcMore,
  IcNote,
  IcSpark,
  IcTask,
} from "@/components/orage/icons"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { cn } from "@/lib/utils"
import type { ComponentType, SVGProps } from "react"
import type { WorkspaceOption } from "./workspace-switcher"

type Tab = {
  href: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  matchPrefix?: boolean
}

const TABS: Tab[] = [
  { href: "/tasks", label: "Tasks", icon: IcTask, matchPrefix: true },
  { href: "/", label: "Dashboard", icon: IcDashboard },
  { href: "/ai", label: "AI", icon: IcSpark, matchPrefix: true },
  { href: "/notes", label: "Notes", icon: IcNote, matchPrefix: true },
]

const MORE_LINKS: { href: string; label: string }[] = [
  { href: "/rocks", label: "Rocks" },
  { href: "/issues", label: "Issues" },
  { href: "/scorecard", label: "Scorecard" },
  { href: "/l10", label: "L10 Meeting" },
  { href: "/vto", label: "V/TO" },
  { href: "/orgchart", label: "Accountability Chart" },
  { href: "/people", label: "People" },
  { href: "/trash", label: "Trash" },
  { href: "/settings", label: "Settings" },
]

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "??"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function BottomTabBar({
  workspaces = [],
  currentWorkspace,
}: {
  workspaces?: WorkspaceOption[]
  currentWorkspace?: WorkspaceOption
} = {}) {
  const pathname = usePathname()
  const workspaceSlug = useWorkspaceSlug()
  const [moreOpen, setMoreOpen] = useState(false)
  const showSwitcher = workspaces.length > 1 && !!currentWorkspace

  const prefixed = (href: string) =>
    href === "/" ? `/${workspaceSlug}` : `/${workspaceSlug}${href}`

  function isActive(t: Tab) {
    const full = prefixed(t.href)
    if (t.matchPrefix) {
      return t.href !== "/" && (pathname === full || pathname.startsWith(full + "/"))
    }
    return pathname === full
  }

  return (
    <>
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-1/95 backdrop-blur-md border-t border-border-orage h-16 grid grid-cols-5"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {TABS.map((t) => {
          const Icon = t.icon
          const active = isActive(t)
          return (
            <Link
              key={t.href}
              href={prefixed(t.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[10px] tracking-[0.18em] font-display uppercase transition-colors",
                active ? "text-gold-400" : "text-text-muted hover:text-text-primary",
              )}
            >
              <Icon className="w-5 h-5" />
              {t.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="More navigation"
          className="flex flex-col items-center justify-center gap-1 text-[10px] tracking-[0.18em] font-display uppercase text-text-muted hover:text-text-primary transition-colors"
        >
          <IcMore className="w-5 h-5" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setMoreOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 inset-x-0 bg-bg-2 border-t border-border-orage rounded-t-sm p-4 max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            {showSwitcher && currentWorkspace && (
              <>
                <div className="font-display text-[10px] tracking-[0.25em] text-gold-500 mb-3 uppercase">
                  Workspace
                </div>
                <ul className="grid grid-cols-1 gap-1.5 mb-4">
                  {workspaces.map((w) => (
                    <li key={w.id}>
                      <Link
                        href={`/${w.slug}`}
                        prefetch={false}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2.5 rounded-sm border transition-colors",
                          w.id === currentWorkspace.id
                            ? "bg-bg-active border-gold-500/40"
                            : "bg-bg-3 border-border-orage hover:border-gold-500/40",
                        )}
                      >
                        <span
                          className="w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: w.brand_color ?? "var(--gold-500)" }}
                          aria-hidden
                        >
                          {initialsFor(w.name)}
                        </span>
                        <span className="text-[13px] text-text-primary font-medium truncate">
                          {w.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="font-display text-[10px] tracking-[0.25em] text-gold-500 mb-3 uppercase">
              More
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {MORE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={prefixed(l.href)}
                    onClick={() => setMoreOpen(false)}
                    className="block px-3 py-3 bg-bg-3 border border-border-orage rounded-sm text-[13px] text-text-primary hover:border-gold-500 transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="mt-4 w-full py-2.5 border border-border-orage rounded-sm text-[11px] tracking-[0.2em] font-display uppercase text-text-muted hover:text-text-primary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}
