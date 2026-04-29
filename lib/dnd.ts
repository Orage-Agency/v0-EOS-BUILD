/**
 * Orage Core · @dnd-kit helpers
 *
 * The CSS class names (.dragging, .drag-ghost, .drop-zone-active, .drop-line,
 * .draggable-locked) are LOCKED in the design system. JS handlers should
 * toggle these classes; CSS does the rest.
 *
 * This file intentionally only exports class-name constants + a tiny class
 * resolver until the dnd-kit dependency is wired in a later phase.
 */

export const DND_CLASSES = {
  draggable: "draggable",
  dragging: "dragging",
  ghost: "drag-ghost",
  dropZone: "drop-zone",
  dropZoneActive: "drop-zone-active",
  dropLine: "drop-line",
  locked: "draggable-locked",
} as const

export type DndState = {
  isDragging?: boolean
  isOver?: boolean
  canDrag?: boolean
}

/** Compose draggable class names from a dnd-kit-like state object. */
export function draggableClassName(state: DndState): string {
  const parts: string[] = []
  if (state.canDrag === false) parts.push(DND_CLASSES.locked)
  else parts.push(DND_CLASSES.draggable)
  if (state.isDragging) parts.push(DND_CLASSES.dragging)
  return parts.join(" ")
}

/** Compose drop-zone class names. */
export function dropZoneClassName(state: DndState): string {
  const parts = [DND_CLASSES.dropZone]
  if (state.isOver) parts.push(DND_CLASSES.dropZoneActive)
  return parts.join(" ")
}
