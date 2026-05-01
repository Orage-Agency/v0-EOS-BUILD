"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { toast } from "sonner"
import {
  PARENT_GOALS,
  ROCK_DEPARTMENTS,
  ROCK_OUTCOMES,
  rockProgress,
  useRocksStore,
} from "@/lib/rocks-store"
import { getUser, type RockStatus } from "@/lib/mock-data"
import type { WorkspaceMember } from "@/lib/tasks-server"
import { canEditRocks } from "@/lib/permissions"
import { OrageAvatar } from "@/components/orage/avatar"
import { TenantLink } from "@/components/tenant-link"
import { IcCheck, IcClose } from "@/components/orage/icons"
import { dueLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

const STATUS_TAG: Record<string, { label: string; cls: string }> = {
  on_track: { label: "● ON TRACK", cls: "bg-success/15 text-success border-success/40" },
  in_progress: { label: "◐ IN PROGRESS", cls: "bg-info/15 text-info border-info/40" },
  at_risk: { label: "▲ AT RISK", cls: "bg-warning/15 text-warning border-warning/40" },
  off_track: { label: "● OFF TRACK", cls: "bg-danger/15 text-danger border-danger/40" },
  done: { label: "✓ DONE", cls: "bg-gold-500/15 text-gold-400 border-gold-500/40" },
}

const STATUS_OPTIONS: RockStatus[] = ["on_track", "in_progress", "at_risk", "off_track", "done"]

export function RockDrawer() {
  const openId = useRocksStore((s) => s.openRockId)
  const close = useRocksStore((s) => s.closeRock)
  const rocks = useRocksStore((s) => s.rocks)
  const milestones = useRocksStore((s) => s.milestones)
  const linkedTasks = useRocksStore((s) => s.linkedTasks)
  const updates = useRocksStore((s) => s.updates)
  const toggleMilestone = useRocksStore((s) => s.toggleMilestone)
  const addMilestone = useRocksStore((s) => s.addMilestone)
  const removeMilestone = useRocksStore((s) => s.removeMilestone)
  const updateStatus = useRocksStore((s) => s.updateStatus)
  const updateProgress = useRocksStore((s) => s.updateProgress)
  const updateTitle = useRocksStore((s) => s.updateTitle)
  const updateDescription = useRocksStore((s) => s.updateDescription)
  const updateOwner = useRocksStore((s) => s.updateOwner)
  const updateDue = useRocksStore((s) => s.updateDue)
  const deleteRock = useRocksStore((s) => s.deleteRock)
  const currentActor = useRocksStore((s) => s.currentActor)
  const members = useRocksStore((s) => s.members)
  const allowed = currentActor ? canEditRocks(currentActor) : false

  const rock = rocks.find((r) => r.id === openId)
  const ownerMock = rock ? getUser(rock.owner) : null
  const ownerMember: WorkspaceMember | undefined = rock ? members.find((m) => m.id === rock.owner) : undefined
  const owner = ownerMock ?? (ownerMember ? { name: ownerMember.name, initials: ownerMember.initials, color: undefined } : null)
  const ownMs = rock ? milestones.filter((m) => m.rockId === rock.id) : []
  const ownTasks = rock ? linkedTasks.filter((t) => t.rockId === rock.id) : []
  const ownUpdates = rock ? updates.filter((u) => u.rockId === rock.id) : []
  const hasMilestones = ownMs.length > 0
  // If there are milestones, derive %; otherwise expose the raw rock.progress as editable.
  const derivedPct = rock ? rockProgress(rock.id, milestones, rock.progress) : 0
  const open = Boolean(rock)

  const [titleDraft, setTitleDraft] = useState("")
  const [descDraft, setDescDraft] = useState("")
  const [progressDraft, setProgressDraft] = useState(0)
  const [statusOpen, setStatusOpen] = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [milestoneFormOpen, setMilestoneFormOpen] = useState(false)
  const [newMsTitle, setNewMsTitle] = useState("")
  const [newMsDue, setNewMsDue] = useState("")
  const newMsTitleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (rock) {
      setTitleDraft(rock.title)
      setDescDraft(rock.description ?? ROCK_OUTCOMES[rock.id] ?? "")
      setProgressDraft(rock.progress ?? 0)
      setStatusOpen(false)
      setOwnerOpen(false)
      setConfirmDelete(false)
      setMilestoneFormOpen(false)
      setNewMsTitle("")
      setNewMsDue("")
    }
  }, [rock?.id])

  useEffect(() => {
    if (milestoneFormOpen) newMsTitleRef.current?.focus()
  }, [milestoneFormOpen])

  if (!rock) {
    return (
      <AnimatePresence>{null}</AnimatePresence>
    )
  }

  function commitTitle() {
    if (!rock) return
    const next = titleDraft.trim()
    if (!next || next === rock.title) {
      setTitleDraft(rock.title)
      return
    }
    updateTitle(rock.id, next)
  }

  function commitDescription() {
    if (!rock) return
    if ((rock.description ?? "") === descDraft) return
    updateDescription(rock.id, descDraft)
  }

  function handleAddMilestone() {
    if (!rock) return
    const t = newMsTitle.trim()
    if (!t) return
    addMilestone(rock.id, t, newMsDue || "")
    setNewMsTitle("")
    setNewMsDue("")
    toast(`Added "${t}"`)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[560px] flex-col border-l border-border-orage bg-bg-2 shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border-orage px-5 py-3.5 gap-2">
              <div className="relative">
                <button
                  type="button"
                  disabled={!allowed}
                  onClick={() => setStatusOpen((v) => !v)}
                  className={cn(
                    "px-2.5 py-1 rounded-sm border font-display text-[11px] tracking-[0.15em] transition-colors",
                    STATUS_TAG[rock.status]?.cls,
                    allowed && "hover:ring-1 hover:ring-gold-500/40",
                  )}
                >
                  {STATUS_TAG[rock.status]?.label ?? rock.status}
                </button>
                {statusOpen && allowed && (
                  <ul className="absolute left-0 top-9 z-30 w-44 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px]">
                    {STATUS_OPTIONS.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => {
                            updateStatus(rock.id, s)
                            setStatusOpen(false)
                            toast(`Status: ${STATUS_TAG[s]?.label ?? s}`)
                          }}
                          className={cn(
                            "w-full text-left px-3 py-1.5 hover:bg-bg-3",
                            rock.status === s ? "text-gold-400" : "text-text-secondary",
                          )}
                        >
                          {STATUS_TAG[s]?.label ?? s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex items-center gap-1">
                {allowed && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmDelete) {
                        setConfirmDelete(true)
                        toast("Click delete again to confirm", { duration: 3500 })
                        setTimeout(() => setConfirmDelete(false), 3500)
                        return
                      }
                      deleteRock(rock.id)
                      toast(`Deleted "${rock.title}"`)
                    }}
                    title={confirmDelete ? "Click again to confirm" : "Delete rock"}
                    className={cn(
                      "flex h-7 px-2 items-center justify-center rounded text-[11px] font-mono tracking-wider transition-colors",
                      confirmDelete
                        ? "bg-danger text-white"
                        : "text-text-muted hover:bg-danger/10 hover:text-danger",
                    )}
                  >
                    {confirmDelete ? "CONFIRM" : "DELETE"}
                  </button>
                )}
                <button
                  onClick={close}
                  className="flex h-7 w-7 items-center justify-center rounded text-text-muted hover:bg-bg-3 hover:text-text-primary"
                  aria-label="Close drawer"
                >
                  <IcClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                  if (e.key === "Escape") {
                    setTitleDraft(rock.title)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
                disabled={!allowed}
                className="mb-5 w-full bg-transparent font-display text-[26px] leading-tight tracking-wide text-text-primary text-balance outline-none rounded px-1 -mx-1 hover:bg-bg-3/40 focus:bg-bg-3 focus:ring-1 focus:ring-gold-500/40 disabled:cursor-default"
                aria-label="Edit rock title"
              />

              <dl className="mb-6 grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 text-[12px]">
                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">OWNER</dt>
                <dd className="flex items-center gap-2 text-text-secondary relative">
                  {owner && <OrageAvatar user={owner} size="xs" />}
                  <button
                    type="button"
                    disabled={!allowed}
                    onClick={() => setOwnerOpen((v) => !v)}
                    className="hover:text-gold-400 disabled:cursor-default"
                  >
                    {owner?.name ?? "Unassigned"}
                  </button>
                  {ownerOpen && allowed && (
                    <ul className="absolute left-0 top-7 z-30 w-60 rounded-md border border-border-orage bg-bg-2 shadow-orage-lg py-1 text-[12px] max-h-72 overflow-y-auto">
                      {members.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => {
                              updateOwner(rock.id, m.id)
                              setOwnerOpen(false)
                              toast(`Assigned to ${m.name}`)
                            }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 hover:bg-bg-3 flex items-center gap-2",
                              rock.owner === m.id ? "text-gold-400" : "text-text-secondary",
                            )}
                          >
                            <span className="w-5 h-5 rounded-full bg-bg-3 border border-border-orage flex items-center justify-center text-[9px]">
                              {m.initials}
                            </span>
                            {m.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">DUE</dt>
                <dd className="font-mono text-warning flex items-center gap-2">
                  <input
                    type="date"
                    value={rock.due}
                    onChange={(e) => updateDue(rock.id, e.target.value)}
                    disabled={!allowed}
                    className="bg-bg-3 border border-border-orage rounded-sm px-1.5 py-0.5 text-[11px] outline-none focus:border-gold-500 disabled:cursor-default"
                  />
                  <span className="text-text-muted text-[10px]">{weeksRemaining(rock.due)}</span>
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">PROGRESS</dt>
                <dd className="flex items-center gap-3">
                  {hasMilestones ? (
                    <div className="font-mono text-gold-400 font-semibold text-[14px]">
                      {derivedPct}% ·{" "}
                      <span className="text-[11px] text-text-muted font-normal">
                        derived from {ownMs.filter((m) => m.done).length}/{ownMs.length} milestones
                      </span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={progressDraft}
                        disabled={!allowed}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setProgressDraft(v)
                          updateProgress(rock.id, v)
                        }}
                        className="flex-1 accent-gold-500"
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={progressDraft}
                        disabled={!allowed}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                          setProgressDraft(v)
                          updateProgress(rock.id, v)
                        }}
                        className="w-16 bg-bg-3 border border-border-orage rounded-sm px-2 py-0.5 text-[12px] font-mono text-gold-400 outline-none focus:border-gold-500"
                      />
                      <span className="font-mono text-gold-400 text-[12px]">%</span>
                    </>
                  )}
                </dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">DEPARTMENT</dt>
                <dd className="text-text-secondary">{ROCK_DEPARTMENTS[rock.id] ?? rock.tag ?? "—"}</dd>

                <dt className="font-mono text-[10px] tracking-[0.1em] text-text-muted self-center">PARENT</dt>
                <dd>
                  <span className="font-display text-[10px] tracking-[0.15em] text-gold-400 bg-gold-500/10 px-2 py-1 rounded-sm">
                    ↑ {PARENT_GOALS[rock.id] ?? "1-YEAR GOAL"}
                  </span>
                </dd>
              </dl>

              <section className="mb-6">
                <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">
                  MEASURABLE OUTCOME
                </div>
                <textarea
                  value={descDraft}
                  onChange={(e) => {
                    setDescDraft(e.target.value)
                    updateDescription(rock.id, e.target.value)
                  }}
                  onBlur={commitDescription}
                  disabled={!allowed}
                  placeholder="What does done look like? Be specific & measurable."
                  className="w-full min-h-[88px] resize-y rounded-md border border-border-orage bg-bg-3 px-3.5 py-3 text-[13px] leading-relaxed text-text-secondary outline-none focus:border-gold-500/50"
                />
              </section>

              <section className="mb-6">
                <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-text-muted">
                  <span>MILESTONES</span>
                  {allowed && (
                    <button
                      type="button"
                      onClick={() => setMilestoneFormOpen((v) => !v)}
                      className="text-gold-400 hover:text-gold-500 transition-colors"
                    >
                      {milestoneFormOpen ? "Cancel" : "+ Add milestone"}
                    </button>
                  )}
                </div>

                {milestoneFormOpen && allowed && (
                  <div className="mb-2 rounded-md border border-gold-500/30 bg-bg-3 px-3 py-2.5 flex flex-col gap-2">
                    <input
                      ref={newMsTitleRef}
                      value={newMsTitle}
                      onChange={(e) => setNewMsTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddMilestone()
                        if (e.key === "Escape") setMilestoneFormOpen(false)
                      }}
                      placeholder="Milestone title"
                      className="bg-bg-2 border border-border-orage rounded-sm px-2 py-1.5 text-[13px] text-text-primary outline-none focus:border-gold-500"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={newMsDue}
                        onChange={(e) => setNewMsDue(e.target.value)}
                        className="bg-bg-2 border border-border-orage rounded-sm px-2 py-1 text-[12px] outline-none focus:border-gold-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddMilestone}
                        className="px-3 py-1 bg-gold-500 text-text-on-gold rounded-sm text-[11px] font-semibold hover:bg-gold-400"
                      >
                        ADD
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {ownMs.length === 0 && !milestoneFormOpen && (
                    <div className="rounded-md border border-dashed border-border-orage bg-bg-3 px-3 py-4 text-center text-[12px] text-text-muted">
                      No milestones yet.
                    </div>
                  )}
                  {ownMs.map((m) => {
                    const due = dueLabel(m.due)
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "group flex items-center gap-2.5 rounded-md border border-border-orage bg-bg-3 px-3 py-2.5 transition-colors",
                          allowed && "hover:border-gold-500/40",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => allowed && toggleMilestone(m.id)}
                          disabled={!allowed}
                          aria-label={m.done ? "Mark not done" : "Mark done"}
                          className={cn(
                            "w-4 h-4 rounded-sm border-[1.5px] flex items-center justify-center shrink-0",
                            m.done
                              ? "bg-gold-500 border-gold-500"
                              : "border-border-strong hover:border-gold-500",
                          )}
                        >
                          {m.done && <IcCheck className="w-2.5 h-2.5 text-text-on-gold" />}
                        </button>
                        <span
                          className={cn(
                            "flex-1 text-[13px] text-text-primary",
                            m.done && "line-through text-text-muted",
                          )}
                        >
                          {m.title}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[10px] shrink-0",
                            due.tone === "overdue"
                              ? "text-danger"
                              : due.tone === "urgent"
                                ? "text-warning"
                                : "text-text-muted",
                          )}
                        >
                          {due.label}
                        </span>
                        {allowed && (
                          <button
                            type="button"
                            onClick={() => {
                              removeMilestone(m.id)
                              toast(`Removed "${m.title}"`)
                            }}
                            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger text-[10px] font-mono ml-1 transition-opacity"
                            aria-label="Remove milestone"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>

              {ownTasks.length > 0 && (
                <section className="mb-6">
                  <div className="mb-2 flex items-center justify-between font-mono text-[10px] tracking-[0.1em] text-text-muted">
                    <span>LINKED TASKS · {ownTasks.length}</span>
                    <TenantLink href="/tasks" className="text-gold-400 hover:text-gold-500 transition-colors">
                      View all in Tasks →
                    </TenantLink>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {ownTasks.map((t) => {
                      const oMock = getUser(t.ownerId)
                      const oMember = members.find((m) => m.id === t.ownerId)
                      const o = oMock ?? (oMember ? { name: oMember.name, initials: oMember.initials, color: undefined } : null)
                      const due = dueLabel(t.due)
                      return (
                        <div
                          key={t.id}
                          className="flex items-center gap-2.5 rounded-md border border-border-orage bg-bg-3 px-3 py-2.5"
                        >
                          <span className="w-3.5 h-3.5 rounded-sm border-[1.5px] border-border-strong shrink-0" />
                          <span className="flex-1 text-[12px] text-text-secondary truncate">{t.title}</span>
                          <span className="font-mono text-[10px] text-text-muted shrink-0">{due.label}</span>
                          {o && <OrageAvatar user={o} size="xs" />}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {ownUpdates.length > 0 && (
                <section>
                  <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-text-muted">
                    UPDATE FEED
                  </div>
                  <div className="flex flex-col gap-2">
                    {ownUpdates.map((u) => (
                      <div
                        key={u.id}
                        className="rounded-md border border-border-orage bg-bg-3 px-3 py-2.5"
                      >
                        <div
                          className={cn(
                            "mb-1 font-mono text-[10px] tracking-wider",
                            u.authorId === "AI" ? "text-gold-400" : "text-text-muted",
                          )}
                        >
                          {u.authorLabel} · {u.at}
                        </div>
                        <div className="text-[12px] leading-relaxed text-text-secondary">{u.body}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function weeksRemaining(due: string | null | undefined): string {
  if (!due) return "—"
  const d = new Date(due + "T00:00:00")
  if (Number.isNaN(d.getTime())) return "—"
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7))
  if (diff < 0) return "OVERDUE"
  if (diff === 0) return "THIS WEEK"
  return `${diff} ${diff === 1 ? "WEEK" : "WEEKS"}`
}
