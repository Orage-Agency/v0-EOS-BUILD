"use client"

import { useEffect } from "react"
import { useUIStore } from "@/lib/store"

/**
 * Global keyboard shortcuts:
 *   ⌘K / Ctrl+K  → command palette
 *   ⌘J / Ctrl+J  → AI panel
 *   Esc          → close anything open (handled inside each surface)
 *
 * Single-letter shortcuts (T = task, R = rock, etc.) are handled inside
 * the relevant pages so they don't fire while typing in inputs.
 */
export function KeyboardShortcuts() {
  const toggleCommand = useUIStore((s) => s.toggleCommand)
  const toggleAiPanel = useUIStore((s) => s.toggleAiPanel)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      const k = e.key.toLowerCase()
      if (k === "k") {
        e.preventDefault()
        toggleCommand()
      } else if (k === "j") {
        e.preventDefault()
        toggleAiPanel()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggleCommand, toggleAiPanel])

  return null
}
