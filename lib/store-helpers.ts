"use client"

import { toast } from "sonner"

/**
 * Optimistic-write reconciler used by every Zustand store that mirrors a
 * Supabase row. Server actions return `{ ok: true, … } | { ok: false, error }`
 * — they don't throw — so the historical `.catch(console.error)` pattern
 * silently swallowed `ok: false` and left optimistic UI lying about reality.
 *
 * Pass the action's promise plus a `rollback` closure. On a non-ok response
 * (or a thrown network error) the rollback runs and the user gets a
 * toast.error with the supplied label. On success this is a no-op.
 *
 * Usage:
 *   const prev = current()
 *   set(optimistic)
 *   reconcile(serverAction(...), () => set(prev), "Couldn't update status")
 */
export function reconcile<T extends { ok: boolean; error?: string } | void>(
  promise: Promise<T>,
  rollback: () => void,
  label: string,
) {
  promise
    .then((res) => {
      if (res && res.ok === false) {
        rollback()
        toast.error(`${label}: ${res.error ?? "save failed"}`)
      }
    })
    .catch((err) => {
      rollback()
      toast.error(
        `${label}: ${err instanceof Error ? err.message : "network error"}`,
      )
    })
}
