"use client"

import { useEffect } from "react"

/**
 * Service worker registration. Runs once on mount, only in production
 * (avoids SW caching dev builds and confusing hot-reload). Failures are
 * non-fatal — the app works fine without it; the SW just adds offline
 * fallback for previously-visited pages.
 */
export function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof window === "undefined") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => {
        console.warn("[sw] register failed", err)
      })
  }, [])
  return null
}
