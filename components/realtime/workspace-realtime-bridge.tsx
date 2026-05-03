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
 * Single workspace-scoped Realtime subscription. Mounted once in the
 * (app) layout. Any insert/update/delete on the workspace's rows triggers
 * a debounced router.refresh(), so any open module page (Rocks, Tasks,
 * Issues...) picks up the change without polling or a hard reload.
 *
 * The event filter `tenant_id=eq.<id>` runs server-side so a user only
 * receives events for workspaces they belong to. RLS still gates the
 * actual row contents on the SELECT side.
 */
export function WorkspaceRealtimeBridge({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!tenantId) return
    const sb = createClient()
    const channel = sb.channel(`ws_${tenantId}`)
    for (const table of TABLES) {
      channel.on(
        // Supabase Realtime's typings hate the wildcard event but the runtime accepts it.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table,
          // Most tables use tenant_id; notifications is keyed the same.
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          // Debounce a burst of events into a single router.refresh().
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => router.refresh(), 250)
        },
      )
    }
    channel.subscribe()
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      sb.removeChannel(channel)
    }
  }, [tenantId, router])

  return null
}
