"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { changePassword } from "@/app/actions/auth"
import { SCard, FieldRow } from "./ui"
import { cn } from "@/lib/utils"

export function ChangePasswordCard() {
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (next.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (next !== confirm) {
      setError("Passwords do not match")
      return
    }

    startTransition(async () => {
      const result = await changePassword(next)
      if (result.error) {
        setError(result.error)
        return
      }
      setNext("")
      setConfirm("")
      toast("PASSWORD UPDATED")
    })
  }

  return (
    <SCard title="CHANGE PASSWORD">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <FieldRow
          name="New password"
          hint="At least 8 characters"
          control={
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className={inputClass}
              placeholder="••••••••"
            />
          }
        />
        <FieldRow
          name="Confirm password"
          hint="Re-enter the new password"
          control={
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
              className={inputClass}
              placeholder="••••••••"
            />
          }
        />

        {error && (
          <div
            className="px-3 py-2 border-l-2 border-danger bg-[rgba(194,84,80,0.08)] text-[12px] text-danger"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "px-4 py-1.5 font-display text-[10px] tracking-[0.18em] rounded-sm text-text-on-gold font-semibold transition-all",
              "hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(182,128,57,0.3)]",
              "disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none",
            )}
            style={{
              background:
                "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
            }}
          >
            {pending ? "UPDATING…" : "UPDATE PASSWORD"}
          </button>
        </div>
      </form>
    </SCard>
  )
}

const inputClass = cn(
  "max-w-[280px] px-3 py-2 bg-bg-2 border border-border-orage rounded-sm",
  "text-[13px] text-text-primary outline-none transition-colors",
  "focus:border-gold-500/60 focus:bg-bg-3",
)
