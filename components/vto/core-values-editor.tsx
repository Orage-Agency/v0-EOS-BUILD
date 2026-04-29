"use client"

/**
 * Drag-reorderable list of core values (max 7). Same @dnd-kit/sortable
 * pattern as Issues. Renumbers automatically on drop.
 */

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useVTOStore, type CoreValue } from "@/lib/vto-store"

export function CoreValuesEditor({ canEdit }: { canEdit: boolean }) {
  const coreValues = useVTOStore((s) => s.coreValues)
  const reorder = useVTOStore((s) => s.reorderCoreValues)
  const addCoreValue = useVTOStore((s) => s.addCoreValue)
  const markDirty = useVTOStore((s) => s.markDirty)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    if (!canEdit || !e.over || e.active.id === e.over.id) return
    const ids = coreValues.map((v) => v.id)
    const oldIdx = ids.indexOf(e.active.id as string)
    const newIdx = ids.indexOf(e.over.id as string)
    if (oldIdx < 0 || newIdx < 0) return
    const next = arrayMove(ids, oldIdx, newIdx)
    reorder(next)
    markDirty()
    toast("REORDERED")
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={coreValues.map((v) => v.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2">
            {coreValues.map((v, idx) => (
              <ValueItem
                key={v.id}
                value={v}
                num={idx + 1}
                canEdit={canEdit}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {canEdit && coreValues.length < 7 ? (
        <button
          type="button"
          onClick={() => {
            addCoreValue()
            markDirty()
          }}
          className="mt-1 px-3 py-2 w-full flex items-center justify-center gap-1.5 border border-dashed border-border-orage rounded-sm text-text-muted font-display text-[10px] tracking-[0.15em] hover:border-gold-500 hover:text-gold-400 hover:bg-gold-500/5 transition-colors"
        >
          + ADD CORE VALUE
        </button>
      ) : null}

      {coreValues.length >= 7 ? (
        <p className="text-[10px] text-text-dim font-mono tracking-wider mt-1">
          MAX 7 · EOS RULE
        </p>
      ) : null}
    </div>
  )
}

function ValueItem({
  value,
  num,
  canEdit,
}: {
  value: CoreValue
  num: number
  canEdit: boolean
}) {
  const updateName = useVTOStore((s) => s.updateCoreValueName)
  const updateDesc = useVTOStore((s) => s.updateCoreValueDescription)
  const remove = useVTOStore((s) => s.removeCoreValue)
  const markDirty = useVTOStore((s) => s.markDirty)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: value.id, disabled: !canEdit })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[30px_1fr_30px] gap-2.5 items-center px-3.5 py-2.5 bg-bg-2 border-l-2 border-gold-500 rounded-r-sm transition-colors",
        canEdit ? "draggable hover:bg-bg-4" : "opacity-90",
        isDragging && "dragging",
      )}
      {...attributes}
      {...listeners}
    >
      <span className="font-display text-lg text-gold-400 text-center leading-none">
        {num}
      </span>
      <div className="flex flex-col gap-1 min-w-0">
        <input
          aria-label={`Core value ${num} name`}
          value={value.name}
          disabled={!canEdit}
          onChange={(e) => {
            updateName(value.id, e.target.value)
            markDirty()
          }}
          className="font-display text-sm tracking-[0.06em] text-gold-400 bg-transparent w-full focus:outline-none disabled:opacity-90"
        />
        <input
          aria-label={`Core value ${num} description`}
          value={value.description}
          disabled={!canEdit}
          onChange={(e) => {
            updateDesc(value.id, e.target.value)
            markDirty()
          }}
          className="text-[11px] text-text-secondary bg-transparent w-full leading-snug focus:outline-none disabled:opacity-90"
        />
      </div>
      {canEdit ? (
        <button
          type="button"
          aria-label="Remove core value"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            remove(value.id)
            markDirty()
            toast("REMOVED")
          }}
          className="w-6 h-6 rounded-sm flex items-center justify-center text-text-muted hover:bg-danger/15 hover:text-danger transition-colors text-sm leading-none opacity-0 group-hover:opacity-100"
        >
          ×
        </button>
      ) : (
        <span aria-hidden />
      )}
    </li>
  )
}
