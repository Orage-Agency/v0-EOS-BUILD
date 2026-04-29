"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { selectIssuesByQueue, useIssuesStore } from "@/lib/issues-store"
import { updateIssueRanks } from "@/app/actions/issues"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { OrageEmpty } from "@/components/empty/orage-empty"
import { IssueRow } from "./issue-row"
import { QuickAddRow } from "./quick-add-row"

export function IssuesList() {
  const { issues, activeQueue, reorderIssues } = useIssuesStore()
  const list = selectIssuesByQueue(issues, activeQueue)
  const [pendingError, setPendingError] = useState<string | null>(null)
  const workspaceSlug = useWorkspaceSlug()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const draggable = activeQueue === "open"

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = list.map((i) => i.id)
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    const reordered = arrayMove(ids, oldIndex, newIndex)
    reorderIssues(reordered)
    try {
      await updateIssueRanks(workspaceSlug, reordered)
      setPendingError(null)
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : "Failed to save order")
    }
  }

  return (
    <div className="bg-bg-3 border border-border-orage rounded-sm overflow-hidden">
      <header
        className="grid items-center gap-3 px-4 py-3 bg-bg-2 border-b border-border-orage font-display text-[10px] tracking-[0.18em] text-text-muted uppercase"
        style={{
          gridTemplateColumns:
            "24px 36px 1fr 100px 110px 60px 30px 30px",
        }}
      >
        <span aria-hidden />
        <span>Rank</span>
        <span>Issue</span>
        <span>Severity</span>
        <span>Stage</span>
        <span>Age</span>
        <span>Owner</span>
        <span aria-hidden />
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={list.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.length === 0 ? (
            activeQueue === "open" ? (
              <div className="px-4 py-8">
                <OrageEmpty
                  variant="panel"
                  eyebrow="IDS · IDENTIFY · DISCUSS · SOLVE"
                  title="OPEN QUEUE IS EMPTY"
                  description="An issue is anything in the way: a bottleneck, a question, a decision, a risk. Drop it here and the team works through it in Monday's L10."
                  bullets={[
                    "Quick-add at the bottom of this list",
                    "Drag to rank — the top 3 surface in the meeting",
                    "Resolve into a rock, task, decision, or archive",
                  ]}
                  footnote="SHIFT+CLICK = MOVE TO L10 · DRAG = RE-RANK"
                />
              </div>
            ) : (
              <div className="px-4 py-12 text-center text-text-muted text-xs font-mono uppercase tracking-wider">
                Nothing in this queue.
              </div>
            )
          ) : (
            list.map((issue, idx) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                draggable={draggable}
                isLast={idx === list.length - 1}
              />
            ))
          )}
        </SortableContext>
      </DndContext>

      {activeQueue === "open" && <QuickAddRow />}

      {pendingError ? (
        <div
          role="alert"
          className="px-4 py-2 text-[10px] font-mono text-danger border-t border-border-orage bg-[rgba(194,84,80,0.06)]"
        >
          {pendingError}
        </div>
      ) : null}
    </div>
  )
}
