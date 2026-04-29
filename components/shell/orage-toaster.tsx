"use client"

import { Toaster } from "sonner"

/**
 * Sonner toaster styled to match the locked Orage toast look:
 * Bebas Neue · gold-on-dark glass · centered bottom · spring slide.
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
            "glass-strong border-gold-500 rounded-sm shadow-orage-lg shadow-gold px-5 py-2.5 text-[11px] text-gold-400 font-display tracking-[0.15em] uppercase z-[300] flex items-center gap-2",
        },
      }}
    />
  )
}
