"use client"

/**
 * Recursive accountability chart with fit-to-screen + drag-to-pan.
 * Each parent's children sit directly underneath it with classic
 * org-chart connectors. The container auto-fits the tree on first
 * paint and on window resize; once the user zooms in, click-and-drag
 * pans the chart.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import type React from "react"
import { toast } from "sonner"
import { SeatNode } from "./seat-node"
import { useOrgChartStore, type Seat } from "@/lib/orgchart-store"

const MIN_ZOOM = 25
const FIT_PADDING = 48 // px breathing room around the tree

export function TreeView() {
  const seats = useOrgChartStore((s) => s.seats)
  const filter = useOrgChartStore((s) => s.filter)
  const zoom = useOrgChartStore((s) => s.zoom)
  const setZoom = useOrgChartStore((s) => s.setZoom)
  const fitSignal = useOrgChartStore((s) => s.fitSignal)
  const addSeat = useOrgChartStore((s) => s.addSeat)
  const openDrawer = useOrgChartStore((s) => s.openDrawer)

  const visible = seats.filter((seat) => {
    if (filter === "all") return true
    if (filter === "filled") return !seat.vacant
    if (filter === "empty") return seat.vacant
    if (filter === "gwc-issues")
      return (
        !seat.vacant &&
        (seat.gwc.g !== "yes" || seat.gwc.w !== "yes" || seat.gwc.c !== "yes")
      )
    return true
  })

  const visibleIds = new Set(visible.map((s) => s.id))
  const roots = visible.filter(
    (s) => s.parentId === null || !visibleIds.has(s.parentId),
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const hasInitialFit = useRef(false)

  // Measure the tree's natural (unscaled) layout size whenever it changes.
  useLayoutEffect(() => {
    if (!contentRef.current) return
    const node = contentRef.current
    const observer = new ResizeObserver(() => {
      const w = node.offsetWidth
      const h = node.offsetHeight
      setNatural((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function computeFitZoom() {
    const container = containerRef.current
    if (!container || !natural.w || !natural.h) return 100
    const cw = container.clientWidth - FIT_PADDING
    const ch = container.clientHeight - FIT_PADDING
    if (cw <= 0 || ch <= 0) return 100
    const fit = Math.min(cw / natural.w, ch / natural.h) * 100
    // never auto-zoom above 100% — small charts stay at their natural size
    return Math.max(MIN_ZOOM, Math.min(100, Math.floor(fit)))
  }

  // First-time fit: run once natural size is known.
  useEffect(() => {
    if (hasInitialFit.current) return
    if (!natural.w || !natural.h) return
    setZoom(computeFitZoom())
    hasInitialFit.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural.w, natural.h])

  // Re-fit when the toolbar fit button is pressed.
  useEffect(() => {
    if (fitSignal === 0) return
    setZoom(computeFitZoom())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal])

  // Re-fit on window resize so the chart never overflows when the viewport shrinks.
  useEffect(() => {
    function onResize() {
      if (!natural.w || !natural.h) return
      setZoom(computeFitZoom())
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural.w, natural.h])

  // --- drag-to-pan -----------------------------------------------------------
  const drag = useRef({ active: false, x: 0, y: 0, sl: 0, st: 0 })

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const container = containerRef.current
    if (!container || e.button !== 0) return
    const target = e.target as HTMLElement
    // never start a drag on top of an interactive element
    if (target.closest("button, a, input, textarea, select, [role='button']"))
      return
    drag.current = {
      active: true,
      x: e.clientX,
      y: e.clientY,
      sl: container.scrollLeft,
      st: container.scrollTop,
    }
    container.setPointerCapture(e.pointerId)
    container.style.cursor = "grabbing"
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return
    const container = containerRef.current
    if (!container) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    container.scrollLeft = drag.current.sl - dx
    container.scrollTop = drag.current.st - dy
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return
    drag.current.active = false
    const container = containerRef.current
    if (container) {
      try {
        container.releasePointerCapture(e.pointerId)
      } catch {
        /* pointer may already be released */
      }
      container.style.cursor = ""
    }
  }

  // --- render ----------------------------------------------------------------
  const scale = zoom / 100
  const sizedWidth = natural.w ? natural.w * scale : undefined
  const sizedHeight = natural.h ? natural.h * scale : undefined

  return (
    <div
      ref={containerRef}
      className="overflow-auto p-6 cursor-grab select-none"
      style={{ height: "calc(100vh - 280px)", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div
        style={{
          width: sizedWidth ?? "100%",
          height: sizedHeight ?? "auto",
          margin: "0 auto",
          position: "relative",
        }}
      >
        <div
          ref={contentRef}
          className="flex flex-col items-center gap-10"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            top: 0,
            left: 0,
            // give the inner flex a known width while measuring so children
            // can establish their own subtree widths cleanly
            width: "max-content",
          }}
        >
          {roots.map((root) => (
            <SubTree key={root.id} seat={root} seats={visible} />
          ))}

          <div className="mt-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                const id = addSeat({ title: "NEW SEAT", parentId: null })
                toast("NEW SEAT")
                openDrawer(id)
              }}
              className="px-5 py-3.5 bg-transparent border border-dashed border-border-orage rounded-md text-text-muted font-display text-[11px] tracking-[0.15em] flex items-center justify-center gap-2 w-[240px] hover:border-gold-500 hover:text-gold-400 hover:bg-gold-500/5 transition-colors"
            >
              + ADD SEAT
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubTree({ seat, seats }: { seat: Seat; seats: Seat[] }) {
  const children = seats.filter((s) => s.parentId === seat.id)

  return (
    <div className="flex flex-col items-center">
      <SeatNode seat={seat} />

      {children.length > 0 ? (
        <>
          {/* trunk from this seat down to the children's connector bar */}
          <div className="w-px h-8 bg-border-strong" aria-hidden />

          {children.length === 1 ? (
            <SubTree seat={children[0]} seats={seats} />
          ) : (
            <div className="flex items-start">
              {children.map((child, i) => {
                const isFirst = i === 0
                const isLast = i === children.length - 1
                return (
                  <div
                    key={child.id}
                    className="flex flex-col items-center px-4"
                  >
                    {/* connector zone: horizontal bar + vertical drop */}
                    <div className="relative w-full h-8" aria-hidden>
                      {!isFirst ? (
                        <div className="absolute top-0 left-0 right-1/2 h-px bg-border-strong" />
                      ) : null}
                      {!isLast ? (
                        <div className="absolute top-0 left-1/2 right-0 h-px bg-border-strong" />
                      ) : null}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-border-strong" />
                    </div>
                    <SubTree seat={child} seats={seats} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
