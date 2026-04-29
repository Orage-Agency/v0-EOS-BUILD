export function TimelineView() {
  return (
    <div className="px-8">
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border-orage bg-bg-2 px-6 py-16 text-center">
        <div>
          <div className="mb-2 font-display text-2xl tracking-[0.1em] text-gold-400">TIMELINE VIEW</div>
          <div className="text-[13px] text-text-muted">
            Gantt-style horizontal timeline of all tasks across the quarter. Drag bars to adjust dates.
          </div>
        </div>
      </div>
    </div>
  )
}
