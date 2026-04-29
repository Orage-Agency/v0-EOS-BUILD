"use client"

import { useEffect } from "react"
import { useRocksStore } from "@/lib/rocks-store"
import { CURRENT_USER } from "@/lib/mock-data"
import { canEditRocks } from "@/lib/permissions"
import { RocksHeader } from "./rocks-header"
import { SummaryBar } from "./summary-bar"
import { RocksToolbar } from "./rocks-toolbar"
import { RocksBoard } from "./rocks-board"
import { RockDrawer } from "./rock-drawer"
import { NewRockModal } from "./new-rock-modal"

export function RocksShell() {
  const openNewRock = useRocksStore((s) => s.openNewRock)
  const close = useRocksStore((s) => s.closeRock)
  const closeNew = useRocksStore((s) => s.closeNewRock)
  const allowed = canEditRocks(CURRENT_USER)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const inField =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      if (e.key === "Escape") {
        close()
        closeNew()
        return
      }
      if (!inField && (e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey) {
        if (!allowed) return
        e.preventDefault()
        openNewRock()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [allowed, close, closeNew, openNewRock])

  return (
    <div className="flex h-full flex-col">
      <RocksHeader />
      <SummaryBar />
      <div className="mt-4">
        <RocksToolbar />
      </div>
      <RocksBoard />
      <RockDrawer />
      <NewRockModal />
    </div>
  )
}
