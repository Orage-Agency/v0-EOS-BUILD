"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Lightweight first-run hint. Shown once per `id` per browser; dismissed
 * with the X or by clicking "Got it". State lives in localStorage so the
 * server never needs to track which tips a user has seen — the tradeoff
 * is per-device dismissal, which is fine for first-run guidance.
 *
 * Usage:
 *   <HelpTip
 *     id="rocks.first-rock"
 *     title="What's a rock?"
 *     body="A 90-day priority. Pick 3-7 outcomes you'll ship this quarter."
 *   />
 */
export function HelpTip({
  id,
  title,
  body,
  className,
}: {
  id: string
  title: string
  body: string
  className?: string
}) {
  const storageKey = `orage-tip:${id}`
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    try {
      const dismissed = window.localStorage.getItem(storageKey) === "1"
      if (!dismissed) setOpen(true)
    } catch {
      // localStorage unavailable (incognito edge cases) — show once,
      // hidden after click.
      setOpen(true)
    }
  }, [storageKey])

  if (!hydrated || !open) return null

  function dismiss() {
    setOpen(false)
    try {
      window.localStorage.setItem(storageKey, "1")
    } catch {
      /* noop */
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-sm border border-gold-500/40 bg-gold-500/5 px-4 py-3",
        "flex items-start gap-3 fade-in",
        className,
      )}
    >
      <span
        aria-hidden
        className="w-6 h-6 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-400 text-xs shrink-0"
      >
        ?
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-[11px] tracking-[0.2em] uppercase text-gold-400 mb-1">
          {title}
        </div>
        <div className="text-[12px] text-text-secondary leading-relaxed">
          {body}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={dismiss}
          className="font-display text-[10px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-sm border border-gold-500/40 text-gold-400 hover:bg-gold-500/10 transition-colors"
        >
          Got it
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-6 h-6 rounded-sm flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  )
}

/**
 * Reset all dismissed tooltips. Useful for the "show me the tips again"
 * action in settings.
 */
export function resetHelpTips(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith("orage-tip:")) keys.push(k)
    }
    keys.forEach((k) => window.localStorage.removeItem(k))
  } catch {
    /* noop */
  }
}
