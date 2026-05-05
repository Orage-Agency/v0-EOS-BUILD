"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { changeProfileName } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { SCard, FieldRow } from "./ui"
import { cn } from "@/lib/utils"

export function ChangeNameCard() {
  const [name, setName] = useState("")
  const [initial, setInitial] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled || !user) return
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()
      const current =
        ((profile?.full_name as string | undefined) ??
          (user.user_metadata?.full_name as string | undefined) ??
          (user.email?.split("@")[0] ?? "")) || ""
      if (cancelled) return
      setName(current)
      setInitial(current)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (name.trim() === initial) return

    startTransition(async () => {
      const result = await changeProfileName(name)
      if ("error" in result && result.error) {
        setError(result.error)
        return
      }
      if ("name" in result && result.name) {
        setInitial(result.name)
        setName(result.name)
      }
      toast("DISPLAY NAME UPDATED")
    })
  }

  const dirty = name.trim() !== initial && name.trim().length > 0

  return (
    <SCard title="DISPLAY NAME">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <FieldRow
          name="Your name"
          hint="Shown in the sidebar, audit log, and to invitees"
          control={
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
              className={inputClass}
              placeholder="e.g. Alex Rivera"
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
            disabled={pending || !dirty}
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
            {pending ? "SAVING…" : "SAVE NAME"}
          </button>
        </div>
      </form>
    </SCard>
  )
}

const inputClass = cn(
  "max-w-[360px] px-3 py-2 bg-bg-2 border border-border-orage rounded-sm",
  "text-[13px] text-text-primary outline-none transition-colors",
  "focus:border-gold-500/60 focus:bg-bg-3",
)
