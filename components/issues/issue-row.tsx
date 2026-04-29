"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { OrageAvatar } from "@/components/orage/avatar"
import { IcGrip, IcMore } from "@/components/orage/icons"
import { getUser } from "@/lib/mock-data"
import { type Issue, useIssuesStore } from "@/lib/issues-store"
import { cn } from "@/lib/utils"
import { RankBadge } from "./rank-badge"
import { SeverityPill, StagePill } from "./severity-pill"
import { SourcePill } from "./source-pill"

export function IssueRow({
  issue,
  draggable,
  isLast,
}: {
  issue: Issue
  draggable: boolean
  isLast: boolean
}) {
  const owner = getUser(issue.ownerId)
  const openDrawer = useIssuesStore((s) => s.openDrawer)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, disabled: !draggable })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isTop3 = issue.rank <= 3 && issue.queue === "open"
  const ageOld = issue.ageLabel.endsWith("D") && parseInt(issue.ageLabel) >= 7

  return (
    <div
      ref={setNodeRef}
      onClick={() => openDrawer(issue.id)}
      style={{
        ...style,
        gridTemplateColumns: "24px 36px 1fr 100px 110px 60px 30px 30px",
      }}
      className={cn(
        "grid items-center gap-3 px-4 py-3.5 transition-all cursor-pointer relative bg-bg-3 hover:bg-bg-4 group",
        !isLast && "border-b border-border-orage",
        isTop3 &&
          "bg-gradient-to-r from-[rgba(182,128,57,0.06)] to-transparent",
        isDragging && "dragging",
      )}
    >
      {isTop3 && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold-500"
          style={{ boxShadow: "0 0 8px var(--gold-500)" }}
        />
      )}
      <>
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "text-text-dim opacity-0 group-hover:opacity-60 cursor-grab active:cursor-grabbing transition-opacity",
            !draggable && "cursor-not-allowed group-hover:opacity-30",
          )}
          aria-label="Drag to reorder"
          tabIndex={-1}
          type="button"
        >
          <IcGrip className="w-3.5 h-3.5" />
        </button>

        <RankBadge rank={issue.rank} />

        <div className="min-w-0">
          <div className="text-[13px] text-text-primary font-medium leading-snug mb-1">
            {issue.title}
          </div>
          <div className="text-[10px] text-text-muted font-mono flex items-center gap-2 flex-wrap">
            <SourcePill source={issue.source} label={issue.sourceLabel} />
            {issue.patternHint ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{issue.patternHint}</span>
              </>
            ) : null}
            {issue.linkedRockId ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-gold-400 hover:underline cursor-pointer">
                  ↗ Linked Rock
                </span>
              </>
            ) : null}
            {issue.pinnedForL10 ? (
              <>
                <span aria-hidden>·</span>
                <span className="text-gold-400">📌 PINNED</span>
              </>
            ) : null}
          </div>
        </div>

        <SeverityPill severity={issue.severity} />
        <StagePill stage={issue.stage} />
        <span
          className={cn(
            "text-[11px] font-mono",
            ageOld ? "text-warning" : "text-text-muted",
          )}
        >
          {issue.ageLabel}
        </span>
        {owner ? <OrageAvatar user={owner} size="sm" /> : <span />}
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="Row actions"
          className="w-6 h-6 rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-2 hover:text-gold-400 transition-colors"
        >
          <IcMore className="w-4 h-4" />
        </button>
      </>
    </div>
  )
}
