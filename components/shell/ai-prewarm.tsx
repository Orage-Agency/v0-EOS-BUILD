"use client"

import { useEffect } from "react"

/**
 * Pre-warm the AI Gateway connection when the workspace shell mounts.
 *
 * Why: the first chat turn on a cold gateway pays a TLS handshake +
 * (sometimes) a region routing tax — measured at 1.5–2.5s before the
 * first token. By firing a HEAD request at /api/ai/chat?ping=1 right
 * after the user lands on a workspace page, we get the TLS + DNS
 * resolved while they're still reading the dashboard.
 *
 * The endpoint short-circuits on `ping=1` and returns 204 without
 * actually invoking the model — so this is a free latency win.
 */
export function AiPrewarm() {
  useEffect(() => {
    // Defer slightly so this never competes with critical paint work.
    const id = setTimeout(() => {
      try {
        void fetch("/api/ai/chat?ping=1", {
          method: "HEAD",
          // Don't blow up if the user signs out mid-flight.
          signal: AbortSignal.timeout(3000),
        })
      } catch {
        /* best-effort */
      }
    }, 800)
    return () => clearTimeout(id)
  }, [])
  return null
}
