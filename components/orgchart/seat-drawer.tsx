"use client"

import { useEffect } from "react"
import { TenantLink as Link } from "@/components/tenant-link"
import { toast } from "sonner"
import { OrageAvatar } from "@/components/orage/avatar"
import { ROCKS, TASKS } from "@/lib/mock-data"
import {
  useOrgChartStore,
  userBySeat,
  type GWCAnswer,
} from "@/lib/orgchart-store"
import { cn } from "@/lib/utils"
import { IcClose } from "@/components/orage/icons"

const GWC_CLS: Record<GWCAnswer, string> = {
  yes: "border-success bg-success/[0.06] text-success",
  no: "border-danger bg-danger/[0.06] text-danger",
  pending: "border-border-orage bg-bg-3 text-gold-400",
}

export function SeatDrawer() {
  const seatId = useOrgChartStore((s) => s.drawerSeatId)
  const close = useOrgChartStore((s) => s.closeDrawer)
  const seat = useOrgChartStore((s) =>
    seatId ? s.seats.find((x) => x.id === seatId) : undefined,
  )
  const cycle = useOrgChartStore((s) => s.cycleGWC)
  const updateRole = useOrgChartStore((s) => s.updateRole)
  const addRole = useOrgChartStore((s) => s.addRole)
  const removeRole = useOrgChartStore((s) => s.removeRole)
  const updateTitle = useOrgChartStore((s) => s.updateTitle)

  useEffect(() => {
    if (!seatId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [seatId, close])

  const open = Boolean(seat)
  const user = seat ? userBySeat(seat) : undefined

  const ownedRocks = user ? ROCKS.filter((r) => r.owner === user.id) : []
  const openTasks = user
    ? TASKS.filter((t) => t.owner === user.id && t.status !== "done").slice(0, 5)
    : []

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[200] bg-black/50 backdrop-blur-md transition-opacity",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={close}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Seat detail"
        className={cn(
          "fixed right-0 top-0 h-screen w-[560px] max-w-[90vw] z-[201] glass-strong border-l border-gold-500 flex flex-col shadow-orage-lg transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {seat ? (
          <>
            <header className="flex items-center justify-between px-6 py-4 border-b border-border-orage">
              <span className="font-display text-[10px] tracking-[0.2em] text-gold-400 px-2.5 py-1 bg-gold-500/15 rounded-sm">
                SEAT · {seat.department.toUpperCase()}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="Close drawer"
                className="w-8 h-8 rounded-sm flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-gold-400 transition-colors"
              >
                <IcClose className="w-4 h-4" />
              </button>
            </header>
            <div className="overflow-y-auto flex-1 px-6 py-6">
              <input
                value={seat.title}
                onChange={(e) => updateTitle(seat.id, e.target.value)}
                className="w-full bg-transparent border-0 font-display text-2xl tracking-[0.05em] text-gold-400 leading-tight mb-2 focus:outline-none"
              />
              <p className="text-[12px] text-text-muted mb-5">
                {seat.reportsToLabel
                  ? `Reports to: ${seat.reportsToLabel} · `
                  : ""}
                Created {seat.createdAt} · {seat.daysActive} days active
              </p>

              {user ? (
                <Link
                  href={`/people/${user.id}`}
                  className="flex items-center gap-3.5 mb-6 p-3.5 bg-bg-3 border border-border-orage rounded-sm hover:border-gold-500 transition-colors"
                >
                  <OrageAvatar user={user} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base tracking-[0.05em] text-gold-400 mb-0.5">
                      {user.name.toUpperCase()}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      Sat in seat {seat.daysActive} days
                    </div>
                    <div className="text-[10px] text-text-muted font-mono mt-1">
                      {user.email}
                    </div>
                  </div>
                  <span className="font-display text-[10px] tracking-[0.15em] text-gold-400">
                    VIEW PROFILE →
                  </span>
                </Link>
              ) : (
                <div className="mb-6 p-3.5 bg-warning/[0.06] border border-warning/40 rounded-sm text-[12px] text-text-secondary">
                  <strong className="font-display tracking-[0.15em] text-warning text-[10px] block mb-1">
                    SEAT VACANT
                  </strong>
                  Click any empty seat tile to open the hire flow.
                </div>
              )}

              <section className="mb-6">
                <header className="flex items-center justify-between font-display text-[11px] tracking-[0.2em] text-gold-500 uppercase mb-2.5">
                  <span>ROLES · {seat.roles.length}</span>
                  <span className="text-text-muted text-[10px] tracking-normal normal-case font-sans">
                    EOS rule: 3-7 ideal
                  </span>
                </header>
                <ul className="flex flex-col gap-1.5">
                  {seat.roles.map((r, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-[24px_1fr_24px] gap-2 items-start px-3 py-2 bg-bg-3 border-l-2 border-gold-500 rounded-r-sm group"
                    >
                      <span className="font-display text-xs text-gold-400 text-center pt-0.5">
                        {i + 1}
                      </span>
                      <textarea
                        value={r}
                        onChange={(e) => updateRole(seat.id, i, e.target.value)}
                        rows={1}
                        className="bg-transparent text-[12px] text-text-primary leading-snug focus:outline-none resize-none"
                      />
                      <button
                        type="button"
                        aria-label="Remove role"
                        onClick={() => {
                          removeRole(seat.id, i)
                          toast("ROLE REMOVED")
                        }}
                        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-sm flex items-center justify-center text-text-muted hover:bg-danger/15 hover:text-danger transition"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => {
                    addRole(seat.id)
                    toast("ROLE ADDED")
                  }}
                  className="mt-2 px-3 py-1.5 border border-dashed border-border-orage rounded-sm font-display text-[10px] tracking-[0.15em] text-text-muted hover:border-gold-500 hover:text-gold-400 transition-colors"
                >
                  + ADD ROLE
                </button>
              </section>

              <section className="mb-6">
                <header className="flex items-center justify-between font-display text-[11px] tracking-[0.2em] text-gold-500 uppercase mb-2.5">
                  <span>GWC · LAST QUARTERLY</span>
                  <span className="text-text-muted text-[10px] tracking-normal normal-case font-sans">
                    {seat.capturedAt}
                  </span>
                </header>
                <div className="grid grid-cols-3 gap-2">
                  {(["g", "w", "c"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => {
                        cycle(seat.id, k)
                        toast("GWC UPDATED")
                      }}
                      className={cn(
                        "py-3.5 rounded-sm border text-center transition-colors hover:border-gold-500",
                        GWC_CLS[seat.gwc[k]],
                      )}
                    >
                      <span className="block font-display text-2xl leading-none mb-1">
                        {k.toUpperCase()}
                      </span>
                      <span className="block font-display text-[9px] tracking-[0.15em] text-text-muted uppercase">
                        {k === "g" ? "GET IT" : k === "w" ? "WANT IT" : "CAPACITY"}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {user ? (
                <>
                  <section className="mb-6">
                    <header className="flex items-center justify-between font-display text-[11px] tracking-[0.2em] text-gold-500 uppercase mb-2.5">
                      <span>OWNED ROCKS · {ownedRocks.length}</span>
                      <Link
                        href="/rocks"
                        className="text-text-muted text-[10px] tracking-normal normal-case font-sans hover:text-gold-400 transition-colors"
                      >
                        View all rocks →
                      </Link>
                    </header>
                    {ownedRocks.length === 0 ? (
                      <p className="text-[12px] text-text-muted">No rocks owned.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {ownedRocks.map((r) => (
                          <li
                            key={r.id}
                            className="px-3 py-2.5 bg-bg-3 border border-border-orage rounded-sm flex items-center gap-2.5 text-[12px] hover:border-gold-500 transition-colors"
                          >
                            <span className="text-gold-400 text-[11px]">●</span>
                            <span className="flex-1 text-text-primary line-clamp-1">
                              {r.title}
                            </span>
                            <span className="text-[10px] text-text-muted font-mono">
                              {r.progress}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <header className="flex items-center justify-between font-display text-[11px] tracking-[0.2em] text-gold-500 uppercase mb-2.5">
                      <span>OPEN TASKS · {openTasks.length}</span>
                      <Link
                        href="/tasks"
                        className="text-text-muted text-[10px] tracking-normal normal-case font-sans hover:text-gold-400 transition-colors"
                      >
                        View all tasks →
                      </Link>
                    </header>
                    {openTasks.length === 0 ? (
                      <p className="text-[12px] text-text-muted">No open tasks.</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {openTasks.map((t) => (
                          <li
                            key={t.id}
                            className="px-3 py-2.5 bg-bg-3 border border-border-orage rounded-sm flex items-center gap-2.5 text-[12px] hover:border-gold-500 transition-colors"
                          >
                            <span className="text-gold-400 text-[11px]">✓</span>
                            <span className="flex-1 text-text-primary line-clamp-1">
                              {t.title}
                            </span>
                            <span className="text-[10px] text-text-muted font-mono uppercase tracking-wide">
                              {t.priority}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </aside>
    </>
  )
}
