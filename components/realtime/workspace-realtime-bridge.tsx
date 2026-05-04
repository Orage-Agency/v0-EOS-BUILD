"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const TABLES = [
  "rocks",
  "rock_milestones",
  "tasks",
  "issues",
  "scorecard_metrics",
  "scorecard_entries",
  "notes",
  "notifications",
  "meetings",
] as const

/**
 * True when the user is actively typing into an editable element. We use
 * this to defer realtime-triggered router refreshes — a router.refresh
 * mid-keystroke replays the RSC tree, the page's `setTasks(initial)`
 * effect fires, and the user's optimistic in-flight typing gets stomped.
 *
 * Defers also when ANY drawer/modal text field has focus, including
 * contenteditable surfaces (notes block editor uses Tiptap).
 */
function isUserEditing(): boolean {
  if (typeof document === "undefined") return false
  const el = document.activeElement as HTMLElement | null
  if (!el) return false
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true
  if (el.isContentEditable) return true
  return false
}

/**
 * Single workspace-scoped Realtime subscription. Mounted once in the
 * (app) layout. Any insert/update/delete on the workspace's rows triggers
 * a debounced router.refresh(), so any open module page (Rocks, Tasks,
 * Issues...) picks up the change without polling or a hard reload.
 *
 * Edit-stomp guard: at fire time the bridge checks if the user is
 * actively typing somewhere; if yes, it reschedules until they stop
 * (with a 30s ceiling so a user who left their cursor in a textarea
 * forever still eventually sees workspace updates).
 *
 * The event filter `tenant_id=eq.<id>` runs server-side so a user only
 * receives events for workspaces they belong to. RLS still gates the
 * actual row contents on the SELECT side.
 */
export function WorkspaceRealtimeBridge({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstScheduledAtRef = useRef<number>(0)

  useEffect(() => {
    if (!tenantId) return
    const sb = createClient()
    const channel = sb.channel(`ws_${tenantId}`)

    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (firstScheduledAtRef.current === 0) {
        firstScheduledAtRef.current = Date.now()
      }
      timerRef.current = setTimeout(fireRefresh, 800)
    }

    const fireRefresh = () => {
      const elapsed = Date.now() - firstScheduledAtRef.current
      if (isUserEditing() && elapsed < 30_000) {
        // Try again in 800ms — re-check whether the user is still typing.
        timerRef.current = setTimeout(fireRefresh, 800)
        return
      }
      firstScheduledAtRef.current = 0
      router.refresh()
    }

    for (const table of TABLES) {
      channel.on(
        // Supabase Realtime's typings hate the wildcard event but the runtime accepts it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table,
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => scheduleRefresh(),
      )
    }
    channel.subscribe()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      firstScheduledAtRef.current = 0
      sb.removeChannel(channel)
    }
  }, [tenantId, router])

  return null
}
