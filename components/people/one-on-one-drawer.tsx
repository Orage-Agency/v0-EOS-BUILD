"use client"

import { useEffect } from "react"
import { usePeopleStore, userById } from "@/lib/people-store"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcClose } from "@/components/orage/icons"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export function OneOnOneDrawer() {
  const id = usePeopleStore((s) => s.drawerOneOnOneId)
  const close = usePeopleStore((s) => s.closeOneOnOneDrawer)
  const ooo = usePeopleStore((s) => (id ? s.getOneOnOne(id) : undefined))
  const updateTitle = usePeopleStore((s) => s.updateOneOnOneTitle)
  const updateAgenda = usePeopleStore((s) => s.updateOneOnOneAgenda)
  const updateNotes = usePeopleStore((s) => s.updateOneOnOneNotes)
  const toggleAction = usePeopleStore((s) => s.toggleAction)

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [id, close])

  if (!id || !ooo) return null
  const target = userById(ooo.personId)
  const partner = userById(ooo.withId)
  const d = new Date(ooo.scheduledAt)
  const dateLabel = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeLabel = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 fade-in"
        onClick={close}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="1:1 details"
        className="fixed top-0 right-0 bottom-0 w-full sm:w-[560px] bg-bg-2 border-l border-border-orage z-50 flex flex-col shadow-2xl"
      >
        <header className="flex items-center justify-between px-5 h-[60px] border-b border-border-orage">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-display text-[10px] tracking-[0.2em] text-text-muted">
              {dateLabel.toUpperCase()} · {timeLabel}
            </span>
            <span
              className={cn(
                "font-display text-[9px] tracking-[0.18em] px-2 py-0.5 rounded-sm border uppercase whitespace-nowrap",
                ooo.status === "upcoming" &&
                  "bg-gold-500/15 text-gold-400 border-gold-500/30",
                ooo.status === "completed" &&
                  "bg-success/15 text-success border-success/30",
                ooo.status === "missed" &&
                  "bg-danger/15 text-danger border-danger/30",
                ooo.status === "cancelled" &&
                  "bg-bg-active text-text-muted border-border-orage",
              )}
            >
              {ooo.status}
            </span>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="w-8 h-8 rounded-sm hover:bg-bg-hover flex items-center justify-center text-text-muted"
          >
            <IcClose className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <input
            value={ooo.title}
            onChange={(e) => updateTitle(ooo.id, e.target.value)}
            className="bg-transparent border-0 outline-none font-display text-text-primary text-2xl tracking-[0.06em] uppercase focus:ring-0 p-0"
          />

          <section className="flex items-center gap-4">
            <Participant user={target} role="With" />
            <span className="text-text-muted">↔</span>
            <Participant user={partner} role="Manager" />
            <span className="ml-auto text-[11px] font-mono text-text-muted">
              {ooo.durationMin} MIN
            </span>
          </section>

          <Block label="Agenda">
            <textarea
              value={ooo.agenda ?? ""}
              onChange={(e) => updateAgenda(ooo.id, e.target.value)}
              placeholder="What do we want to talk about?"
              rows={4}
              className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500 focus:outline-none resize-none"
            />
          </Block>

          <Block label="Notes">
            <textarea
              value={ooo.notes ?? ""}
              onChange={(e) => updateNotes(ooo.id, e.target.value)}
              placeholder="Capture what came up, blockers, decisions…"
              rows={6}
              className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500 focus:outline-none resize-none"
            />
          </Block>

          <Block label={`Action Items (${ooo.actions.length})`}>
            {ooo.actions.length === 0 ? (
              <p className="text-xs text-text-muted">
                No action items yet. Capture commitments here as they come up.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {ooo.actions.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "flex items-center gap-3 bg-bg-3 border border-border-orage rounded-sm px-3 py-2",
                      a.done && "opacity-60",
                    )}
                  >
                    <button
                      onClick={() => toggleAction(ooo.id, a.id)}
                      aria-label={a.done ? "Mark incomplete" : "Mark complete"}
                      className={cn(
                        "w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0",
                        a.done
                          ? "bg-gold-500 border-gold-500 text-text-on-gold"
                          : "border-border-strong hover:border-gold-500",
                      )}
                    >
                      {a.done && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm text-text-primary",
                        a.done && "line-through text-text-muted",
                      )}
                    >
                      {a.text}
                    </span>
                    {a.ownerLabel && (
                      <span className="font-mono text-[10px] text-text-muted">
                        {a.ownerLabel}
                      </span>
                    )}
                    {a.dueLabel && (
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-wider",
                          a.dueTone === "danger" && "text-danger",
                          a.dueTone === "warn" && "text-warning",
                          (!a.dueTone || a.dueTone === "muted") &&
                            "text-text-muted",
                        )}
                      >
                        {a.dueLabel}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>

        <footer className="border-t border-border-orage px-5 py-3 flex items-center justify-end gap-2">
          <button
            onClick={() => {
              toast("1:1 SAVED")
              close()
            }}
            className="h-9 px-4 bg-gold-500 hover:bg-gold-400 text-text-on-gold text-xs font-semibold tracking-wider uppercase rounded-sm"
          >
            Save & Close
          </button>
        </footer>
      </aside>
    </>
  )
}

function Participant({
  user,
  role,
}: {
  user: ReturnType<typeof userById>
  role: string
}) {
  if (!user) return null
  return (
    <div className="flex items-center gap-2">
      <OrageAvatar user={user} size="sm" />
      <div>
        <div className="text-sm text-text-primary leading-tight">
          {user.name}
        </div>
        <div className="font-display text-[9px] tracking-[0.18em] text-text-muted leading-tight">
          {role.toUpperCase()}
        </div>
      </div>
    </div>
  )
}

function Block({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className="font-display text-[10px] tracking-[0.2em] text-text-muted uppercase">
        {label}
      </h4>
      {children}
    </section>
  )
}
