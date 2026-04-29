"use client"

import { cn } from "@/lib/utils"

/**
 * Orage prototype toggle — gold-on-dark pill with an animated thumb.
 * Matches the .toggle.on pattern from the locked HTML prototypes.
 */
export function OrageToggle({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean
  onChange: () => void
  label?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label ?? (on ? "On" : "Off")}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative w-[38px] h-[22px] rounded-full border transition-colors duration-150 shrink-0",
        on
          ? "bg-success/20 border-success"
          : "bg-bg-2 border-border-orage hover:border-gold-500",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "absolute top-px left-px w-[18px] h-[18px] rounded-full transition-transform duration-150",
          on
            ? "bg-success translate-x-4"
            : "bg-text-muted translate-x-0",
        )}
      />
    </button>
  )
}
