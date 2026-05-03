"use client"

import { Toaster } from "sonner"

/**
 * Sonner toaster styled to match the locked Orage toast look:
 * Bebas Neue · gold/green/red-on-dark glass · centered bottom · spring slide.
 *
 * Variants:
 *   toast(...)         → default (gold)
 *   toast.success(...) → green border + tint
 *   toast.error(...)   → red border + tint, longer dwell
 *   toast.info(...)    → muted gold
 */
export function OrageToaster() {
  return (
    <Toaster
      position="bottom-center"
      theme="dark"
      visibleToasts={3}
      duration={2200}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "glass-strong rounded-sm shadow-orage-lg px-5 py-2.5 text-[11px] font-display tracking-[0.15em] uppercase z-[300] flex items-center gap-2 border",
          default:
            "border-gold-500 text-gold-400 shadow-gold",
          success:
            "border-success text-success shadow-[0_0_18px_-6px_rgba(111,170,107,0.6)]",
          error:
            "border-danger text-danger shadow-[0_0_18px_-6px_rgba(194,84,80,0.6)]",
          info: "border-border-orage text-text-secondary",
          warning: "border-warning text-warning",
        },
      }}
    />
  )
}
