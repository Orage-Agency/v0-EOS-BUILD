"use client"

import { useEffect } from "react"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcArchive, IcCheck, IcClose, IcRock, IcTask } from "@/components/orage/icons"
import { CURRENT_USER, getUser } from "@/lib/mock-data"
import {
  type IssueStage,
  type ResolvePath,
  useIssuesStore,
} from "@/lib/issues-store"
import { canRunL10 } from "@/lib/permissions"
import { cn } from "@/lib/utils"
import { IDSStepper } from "./ids-stepper"
import { SeverityPill } from "./severity-pill"
import { SourcePill } from "./source-pill"

const RESOLVE_OPTIONS: {
  path: ResolvePath
  name: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    path: "rock",
    name: "NEW ROCK",
    description: "90-day commitment to fix root cause",
    Icon: IcRock,
  },
  {
    path: "task",
    name: "TASK",
    description: "Single action item to address",
    Icon: IcTask,
  },
  {
    path: "decision",
    name: "DECISION",
    description: "Record decision · no follow-up needed",
    Icon: IcCheck,
  },
  {
    path: "archive",
    name: "ARCHIVE",
    description: "Tabled or no longer relevant",
    Icon: IcArchive,
  },
]

export function IssueDrawer() {
  const {
    drawerIssueId,
    issues,
    closeDrawer,
    setStage,
    updateContext,
    updateTitle,
    openResolve,
  } = useIssuesStore()

  const issue = issues.find((i) => i.id === drawerIssueId)
  const owner = issue ? getUser(issue.ownerId) : null
  const canResolve = canRunL10({
    id: CURRENT_USER.id,
    role: CURRENT_USER.role,
    isMaster: CURRENT_USER.isMaster,
  })

  useEffect(() => {
    if (!drawerIssueId) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDrawer()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawerIssueId, closeDrawer])

  return (
    <>
      <div
        onClick={closeDrawer}
        className={cn(
          "fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm transition-opacity",
          drawerIssueId
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label={issue ? `Issue · ${issue.title}` : "Issue drawer"}
        className={cn(
          "fixed right-0 top-0 h-screen w-full max-w-[560px] z-[201] flex flex-col transition-transform glass-strong border-l border-gold-500",
          drawerIssueId ? "translate-x-0" : "translate-x-full",
        )}
        style={{ boxShadow: "-12px 0 40px rgba(0,0,0,0.6)" }}
      >
        {issue ? (
          <>
            <header className="px-6 py-4 border-b border-border-orage flex justify-between items-center">
              <span className="font-display text-[11px] tracking-[0.22em] text-text-muted">
                ISSUE · IDS WORKFLOW · RANK #{issue.rank}
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close drawer"
                className="w-7 h-7 rounded-sm flex items-center justify-center text-text-secondary hover:bg-bg-hover hover:text-gold-400 transition-colors"
              >
                <IcClose className="w-3.5 h-3.5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <input
                value={issue.title}
                onChange={(e) => updateTitle(issue.id, e.target.value)}
                className="font-display text-[24px] tracking-[0.05em] text-gold-400 w-full leading-tight mb-3.5 bg-transparent border-none outline-none focus-visible:ring-1 focus-visible:ring-gold-500 rounded-sm"
              />

              <IDSStepper
                stage={issue.stage}
                onChange={(next: IssueStage) => setStage(issue.id, next)}
              />

              <dl
                className="grid gap-2.5 px-3.5 py-3.5 bg-bg-3 rounded-sm border border-border-orage mb-6"
                style={{ gridTemplateColumns: "100px 1fr" }}
              >
                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Source
                </dt>
                <dd className="text-[12px] text-text-secondary flex items-center gap-2">
                  <SourcePill source={issue.source} label={issue.sourceLabel} />
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Severity
                </dt>
                <dd className="text-[12px] text-text-secondary flex items-center gap-2">
                  <SeverityPill severity={issue.severity} />
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Owner
                </dt>
                <dd className="text-[12px] text-text-secondary flex items-center gap-2">
                  {owner ? (
                    <>
                      <OrageAvatar user={owner} size="sm" />
                      {owner.name}
                    </>
                  ) : (
                    "—"
                  )}
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Created
                </dt>
                <dd className="text-[12px] text-text-muted font-mono">
                  {new Date(issue.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  · {issue.ageLabel} AGO
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  Linked
                </dt>
                <dd className="text-[12px] text-info flex items-center gap-2">
                  {issue.linkedRockId
                    ? "↗ Linked Rock"
                    : issue.linkedMetricId
                      ? "↗ Linked Metric"
                      : "—"}
                </dd>

                <dt className="font-display text-[10px] tracking-[0.18em] text-text-muted self-center uppercase">
                  L10
                </dt>
                <dd className="text-[12px] text-gold-400">
                  {issue.pinnedForL10
                    ? "📌 Pinned for next meeting"
                    : "Not pinned"}
                </dd>
              </dl>

              <section className="mb-6">
                <h3 className="font-display text-[11px] tracking-[0.2em] text-gold-500 mb-2.5 uppercase">
                  Context
                </h3>
                <textarea
                  value={issue.context}
                  onChange={(e) => updateContext(issue.id, e.target.value)}
                  className="w-full bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary leading-relaxed resize-y min-h-[90px] outline-none focus-visible:border-gold-500 transition-colors"
                />
              </section>

              <section className="mb-6">
                <h3 className="font-display text-[11px] tracking-[0.2em] text-gold-500 mb-2.5 uppercase">
                  Resolve Into
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {RESOLVE_OPTIONS.map((opt) => (
                    <button
                      key={opt.path}
                      type="button"
                      disabled={!canResolve}
                      onClick={() => openResolve(issue.id)}
                      className={cn(
                        "px-3.5 py-3.5 bg-bg-3 border border-border-orage rounded-sm text-left transition-all hover:border-gold-500 hover:bg-bg-4",
                        !canResolve && "opacity-50 cursor-not-allowed hover:border-border-orage hover:bg-bg-3",
                      )}
                    >
                      <opt.Icon className="w-[18px] h-[18px] text-gold-400 mb-1.5" />
                      <div className="font-display text-[11px] tracking-[0.18em] text-gold-400 mb-1">
                        {opt.name}
                      </div>
                      <div className="text-[10px] text-text-muted leading-snug">
                        {opt.description}
                      </div>
                    </button>
                  ))}
                </div>
                {!canResolve && (
                  <p className="text-[10px] font-mono text-text-muted mt-2">
                    🔒 Only Founder/Admin/Leader can resolve issues.
                  </p>
                )}
              </section>

              <section>
                <h3 className="font-display text-[11px] tracking-[0.2em] text-gold-500 mb-2.5 uppercase">
                  Activity
                </h3>
                <ul className="flex flex-col gap-2 pl-2 border-l border-border-orage">
                  {issue.activity.length === 0 ? (
                    <li className="px-3 py-2 text-[11px] text-text-muted">
                      No activity yet.
                    </li>
                  ) : (
                    issue.activity.map((a) => (
                      <li
                        key={a.id}
                        className="py-2 pl-3 border-l-2 border-gold-500 -ml-px"
                      >
                        <div className="font-display text-[9px] tracking-[0.18em] text-text-muted mb-1">
                          {a.authorLabel}
                        </div>
                        <p className="text-[12px] text-text-secondary leading-relaxed">
                          {a.body}
                        </p>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>
          </>
        ) : null}
      </aside>
    </>
  )
}
