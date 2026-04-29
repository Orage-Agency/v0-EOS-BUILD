"use client"

import { useDraggable } from "@dnd-kit/core"
import { useRocksStore, rockProgress, PARENT_GOALS } from "@/lib/rocks-store"
import { CURRENT_USER, getUser, type MockRock } from "@/lib/mock-data"
import { canEditRocks } from "@/lib/permissions"
import { OrageAvatar } from "@/components/orage/avatar"
import { cn } from "@/lib/utils"

export function RockCard({ rock }: { rock: MockRock }) {
  const openRock = useRocksStore((s) => s.openRock)
  const milestones = useRocksStore((s) => s.milestones)
  const linkedTasks = useRocksStore((s) => s.linkedTasks)
  const allowed = canEditRocks(CURRENT_USER)

  const owner = getUser(rock.owner)
  const ownMs = milestones.filter((m) => m.rockId === rock.id)
  const doneMs = ownMs.filter((m) => m.done).length
  const totalMs = ownMs.length
  const pct = rockProgress(rock.id, milestones, rock.progress)
  const taskCount = linkedTasks.filter((t) => t.rockId === rock.id).length

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: rock.id,
    data: { rock },
    disabled: !allowed,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(allowed ? listeners : {})}
      {...attributes}
      onClick={() => openRock(rock.id)}
      style={style}
      className={cn(
        "group relative w-full text-left p-4 rounded-md bg-bg-3 border border-border-orage transition-all",
        "hover:border-gold-500/50 hover:bg-bg-4",
        allowed ? "cursor-grab active:cursor-grabbing" : "cursor-pointer draggable-locked",
        isDragging && "dragging opacity-40",
      )}
      data-id={rock.id}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-gold-500 mt-0.5 leading-none text-base">●</span>
        <div className="text-[13px] text-text-primary leading-snug font-medium">
          {rock.title}
        </div>
      </div>

      <div className="font-display text-[9px] tracking-[0.18em] text-text-muted mb-3">
        ↑ {PARENT_GOALS[rock.id] ?? "1-YEAR GOAL"}
      </div>

      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="font-mono text-sm font-semibold text-gold-400">{pct}%</span>
          <span className="font-mono text-[10px] text-text-muted">
            {totalMs > 0 ? `${doneMs} of ${totalMs} milestones` : "no milestones yet"}
          </span>
        </div>
        <div className="h-1 bg-bg-base rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold-500 to-gold-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-display text-[9px] tracking-[0.18em] text-gold-500 bg-gold-500/10 px-1.5 py-0.5 rounded-sm">
          {rock.tag}
        </span>
        <span className="font-display text-[9px] tracking-[0.18em] text-text-muted bg-bg-active px-1.5 py-0.5 rounded-sm">
          ↗ {taskCount} {taskCount === 1 ? "TASK" : "TASKS"}
        </span>
        <div className="ml-auto">{owner && <OrageAvatar user={owner} size="xs" />}</div>
      </div>
    </button>
  )
}
