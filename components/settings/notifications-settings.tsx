"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { useParams } from "next/navigation"
import { OrageToggle } from "@/components/orage/toggle"
import { SectionBlock, SCard, FieldRow } from "./ui"
import {
  KIND_ORDER,
  isEnabled,
  labelForKind,
  type NotificationKind,
  type NotificationPrefs,
} from "@/lib/notification-prefs"
import {
  loadNotificationPrefs,
  setNotificationPref,
} from "@/app/actions/notification-prefs"

const HINTS: Record<NotificationKind, string> = {
  task_assigned:
    "When someone reassigns a task to you. Email comes via the daily digest.",
  handoff:
    "When a teammate hands off a task with a context note — you'll see who and why.",
  mention:
    "When you're @mentioned in a note or issue, so you don't miss the ask.",
  overdue: "When one of your tasks slips past its due date.",
  rock_owner_changed: "When ownership of a quarterly rock shifts.",
  milestone_assigned:
    "When you're added to or moved between milestones on a rock.",
  invite_accepted:
    "When a teammate you invited finishes signing up — useful for admins.",
}

export function NotificationsSettings() {
  const params = useParams()
  const workspaceSlug = (params?.workspace as string) ?? ""
  const [prefs, setPrefs] = useState<NotificationPrefs>({})
  const [pending, startTransition] = useTransition()

  // Hydrate from the server on mount.
  useEffect(() => {
    if (!workspaceSlug) return
    void loadNotificationPrefs(workspaceSlug).then((r) => {
      if (r.ok) setPrefs(r.prefs)
    })
  }, [workspaceSlug])

  function flip(kind: NotificationKind, channel: "in_app" | "email") {
    const before = isEnabled(prefs, kind, channel)
    const next = !before
    // Optimistic update — same reconcile pattern we use everywhere.
    setPrefs((p) => {
      const k = { ...(p[kind] ?? {}) }
      k[channel] = next
      // Tidy: drop the entry if it's back to default-on for both channels.
      if (k.in_app !== false && k.email !== false) {
        const copy = { ...p }
        delete copy[kind]
        return copy
      }
      return { ...p, [kind]: k }
    })
    startTransition(async () => {
      const res = await setNotificationPref(workspaceSlug, kind, channel, next)
      if (!res.ok) {
        // Roll back.
        setPrefs((p) => {
          const k = { ...(p[kind] ?? {}) }
          k[channel] = before
          if (k.in_app !== false && k.email !== false) {
            const copy = { ...p }
            delete copy[kind]
            return copy
          }
          return { ...p, [kind]: k }
        })
        toast.error(`Couldn't save: ${res.error ?? "unknown error"}`)
      }
    })
  }

  return (
    <SectionBlock
      title="NOTIFICATIONS"
      description="Per-kind opt-out · in-app suppresses the bell + inbox row, email suppresses the daily digest entry"
    >
      <SCard title="WHEN ORAGE PINGS YOU">
        {KIND_ORDER.map((kind) => (
          <FieldRow
            key={kind}
            name={labelForKind(kind)}
            hint={HINTS[kind]}
            control={
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-text-muted font-display">
                  <OrageToggle
                    on={isEnabled(prefs, kind, "in_app")}
                    onChange={() => flip(kind, "in_app")}
                    label={`In-app ${labelForKind(kind)}`}
                  />
                  In-app
                </label>
                <label className="flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-text-muted font-display">
                  <OrageToggle
                    on={isEnabled(prefs, kind, "email")}
                    onChange={() => flip(kind, "email")}
                    label={`Email ${labelForKind(kind)}`}
                  />
                  Email
                </label>
              </div>
            }
          />
        ))}
        {pending && (
          <div className="px-4 py-2 text-[10px] uppercase tracking-[0.18em] font-mono text-text-muted">
            Saving…
          </div>
        )}
      </SCard>
    </SectionBlock>
  )
}
