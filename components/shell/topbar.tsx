"use client"

import { useUIStore } from "@/lib/store"
import { QuickAddMenu } from "./quick-add-menu"
import { IcSearch } from "@/components/orage/icons"
import { TENANT } from "@/lib/mock-data"
import { Breadcrumb } from "@/components/breadcrumb"
import { NotificationsButton } from "@/components/notifications-panel"
import { CalendarButton } from "@/components/calendar-peek"

export function Topbar() {
  const openCommand = useUIStore((s) => s.openCommand)
  const sessionUser = useUIStore((s) => s.currentUser)
  // Prefer the real workspace name from auth/session over the TENANT mock,
  // so multi-tenant tests don't all show "Orage Agency".
  const workspaceName =
    sessionUser?.workspaceName?.split(" ").slice(0, 2).join(" ") ??
    TENANT.name.split(" ").slice(0, 2).join(" ")

  return (
    <header className="h-14 bg-[rgba(10,10,10,0.7)] backdrop-blur-md border-b border-border-orage flex items-center px-6 gap-4 relative z-10">
      <div className="flex items-center min-w-0">
        <Breadcrumb workspaceName={workspaceName} />
      </div>

      <div className="flex-1 max-w-[400px] relative">
        <button
          type="button"
          onClick={openCommand}
          className="w-full pl-8 pr-12 py-1.5 bg-bg-3 border border-border-orage rounded-sm text-text-dim text-xs text-left hover:border-gold-500 transition-colors focus:outline-none focus:border-gold-500"
          aria-label="Open command palette"
        >
          Search rocks, notes, tasks…
        </button>
        <IcSearch className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-text-muted px-1.5 py-px border border-border-orage rounded-sm bg-bg-2">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <NotificationsButton />
        <CalendarButton />
        <QuickAddMenu />
      </div>
    </header>
  )
}
