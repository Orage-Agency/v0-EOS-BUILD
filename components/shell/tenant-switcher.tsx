"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { TENANTS, getTenant } from "@/lib/tenants"
import { useUIStore } from "@/lib/store"
import { IcChevronDown } from "@/components/orage/icons"
import { cn } from "@/lib/utils"

export function TenantSwitcher() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeTenantId = useUIStore((s) => s.activeTenantId)
  const setActiveTenant = useUIStore((s) => s.setActiveTenant)
  const sessionUser = useUIStore((s) => s.currentUser)
  const active = getTenant(activeTenantId) ?? TENANTS[0]

  // Master users see all tenants; non-masters see only their own.
  const visible = sessionUser?.isMaster
    ? TENANTS
    : TENANTS.filter((t) => t.tier === "master")

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("mousedown", onClick)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("mousedown", onClick)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  function pick(id: string) {
    const t = getTenant(id)
    if (!t) return
    setActiveTenant(id)
    setOpen(false)
    toast(`SWITCHED TO ${t.name.toUpperCase()}`)
  }

  return (
    <div ref={ref} className="relative mx-3 my-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-sm",
          "bg-bg-3 border border-border-orage hover:border-border-strong hover:bg-bg-4",
          "transition-colors text-left",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="w-6 h-6 rounded-sm flex items-center justify-center text-[11px] font-bold text-text-on-gold shrink-0"
          style={{ background: active.color }}
        >
          {active.initials}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold text-text-primary truncate">
            {active.name}
          </span>
          <span className="block font-display text-[9px] tracking-[0.15em] text-gold-500">
            {active.role}
          </span>
        </span>
        <IcChevronDown className="w-3 h-3 text-text-muted" />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+4px)] z-50",
            "glass-strong border-gold-500 rounded-md p-1.5 shadow-orage-lg shadow-gold",
            "fade-in",
          )}
        >
          {visible.map((t, i) => (
            <div key={t.id}>
              <button
                role="menuitem"
                onClick={() => pick(t.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm hover:bg-bg-active transition-colors text-left"
              >
                <span
                  className="w-[22px] h-[22px] rounded-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: t.color }}
                >
                  {t.initials}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs text-text-primary font-medium truncate">
                    {t.name}
                  </span>
                  <span className="block font-display text-[9px] tracking-[0.1em] text-text-muted">
                    {t.role}
                  </span>
                </span>
                {t.isMaster && (
                  <span className="font-display text-[8px] tracking-[0.15em] text-gold-500 px-1.5 py-0.5 rounded-sm bg-gold-500/15 ml-auto">
                    MASTER
                  </span>
                )}
              </button>
              {i === 0 && visible.length > 1 && (
                <div className="h-px bg-border-orage my-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
