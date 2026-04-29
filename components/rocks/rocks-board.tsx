"use client"

import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useRocksStore } from "@/lib/rocks-store"
import { CURRENT_USER, type MockRock, type RockStatus } from "@/lib/mock-data"
import { canEditRocks } from "@/lib/permissions"
import { OrageEmpty } from "@/components/empty/orage-empty"
import { RockColumn } from "./rock-column"
import { RockCard } from "./rock-card"

const COLUMNS: RockStatus[] = ["on_track", "in_progress", "at_risk", "off_track"]
const STATUS_LABEL: Record<RockStatus, string> = {
  on_track: "ON TRACK",
  in_progress: "IN PROGRESS",
  at_risk: "AT RISK",
  off_track: "OFF TRACK",
  done: "DONE",
}

export function RocksBoard() {
  const rocks = useRocksStore((s) => s.rocks)
  const updateStatus = useRocksStore((s) => s.updateStatus)
  const allowed = canEditRocks(CURRENT_USER)
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const grouped = useMemo(() => {
    const map: Record<RockStatus, MockRock[]> = {
      on_track: [],
      in_progress: [],
      at_risk: [],
      off_track: [],
      done: [],
    }
    for (const r of rocks) map[r.status].push(r)
    return map
  }, [rocks])

  const activeRock = activeId ? rocks.find((r) => r.id === activeId) ?? null : null

  function handleDragStart(e: DragStartEvent) {
    if (!allowed) return
    setActiveId(String(e.active.id))
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    if (!allowed) return
    const { active, over } = e
    if (!over) return
    const overData = over.data.current as { status?: RockStatus } | undefined
    if (!overData?.status) return
    const dragged = rocks.find((r) => r.id === active.id)
    if (!dragged) return
    if (overData.status !== dragged.status) {
      updateStatus(dragged.id, overData.status)
      toast(`STATUS · ${STATUS_LABEL[overData.status]}`)
    }
  }

  if (rocks.length === 0) {
    return (
      <div className="px-8 py-8 flex-1 min-h-0">
        <OrageEmpty
          eyebrow="QUARTERLY EXECUTION"
          title="ROCKS QUEUE IS EMPTY"
          description="Rocks are the 3-7 priorities the company is married to this quarter. Type the outcome — not a task — and the AI will tighten it into a SMART rock with owner and due date."
          bullets={[
            "One outcome per rock · two-week chunks at most",
            "Owner gets nudged when status slips out of green",
            "Auto-rolls into the L10 agenda every Monday",
          ]}
          ctas={
            allowed
              ? [
                  { label: "New Rock", onClick: () => useRocksStore.getState().openNewRock() },
                  { label: "How rocks work", href: "/help#rocks", variant: "ghost" },
                ]
              : [{ label: "How rocks work", href: "/help#rocks", variant: "ghost" }]
          }
          footnote="PRESS R · NEW ROCK"
        />
      </div>
    )
  }

  return (
    <div className="px-8 py-5 flex-1 min-h-0 overflow-x-auto">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 min-h-full">
          {COLUMNS.map((status) => (
            <RockColumn key={status} status={status} rocks={grouped[status]} />
          ))}
        </div>
        <DragOverlay>{activeRock ? <RockCard rock={activeRock} /> : null}</DragOverlay>
      </DndContext>
    </div>
  )
}
