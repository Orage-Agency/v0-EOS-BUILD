"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { SCard } from "./ui"
import {
  listTrustedDevicesForCurrentUser,
  revokeAllTrustedDevicesForCurrentUser,
} from "@/app/actions/auth"

type Device = {
  id: string
  label: string | null
  ip: string | null
  createdAt: string
  expiresAt: string
  lastUsedAt: string
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

function untilStr(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return "expired"
  const d = Math.ceil(ms / (24 * 60 * 60 * 1000))
  return `${d}d left`
}

/**
 * Manage the "remember this device" trust list. Lets the user see every
 * device that's authorized to skip the TOTP prompt and revoke them all in
 * one click — important when a laptop is lost or a session goes
 * sideways.
 */
export function TrustedDevicesCard() {
  const [devices, setDevices] = useState<Device[] | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    void refresh()
  }, [])

  async function refresh() {
    const res = await listTrustedDevicesForCurrentUser()
    if (res.ok) setDevices(res.devices)
    else setDevices([])
  }

  function revokeAll() {
    if (!confirm("Revoke every device's MFA bypass? Next sign-in will require a TOTP code on all of them.")) return
    startTransition(async () => {
      const res = await revokeAllTrustedDevicesForCurrentUser()
      if (res.ok) {
        toast.success("All trusted devices revoked")
        setDevices([])
      } else {
        toast.error(res.error)
      }
    })
  }

  if (devices === null) {
    return (
      <SCard title="TRUSTED DEVICES">
        <p className="text-[11px] text-text-muted px-2 py-1.5">Loading…</p>
      </SCard>
    )
  }

  return (
    <SCard
      title="TRUSTED DEVICES"
      action={
        devices.length > 0 ? (
          <button
            type="button"
            onClick={revokeAll}
            disabled={pending}
            data-testid="revoke-trusted-devices"
            className="font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm border border-danger/40 text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
          >
            {pending ? "Revoking…" : "Revoke all"}
          </button>
        ) : null
      }
    >
      <p className="text-[11px] text-text-muted leading-relaxed mb-2">
        Devices that have completed two-factor in the last 30 days and can
        skip the TOTP prompt on sign-in. Revoking forces the prompt on the
        very next attempt.
      </p>
      {devices.length === 0 ? (
        <p className="text-[11px] text-text-muted">
          No trusted devices yet. Tick "Trust this device for 30 days" on
          the next MFA prompt to add one.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-3 px-3 py-2 rounded-sm bg-bg-3 border border-border-orage"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-text-primary">
                  {d.label ?? "Unknown device"}
                </div>
                <div className="text-[10px] text-text-muted font-mono mt-0.5 truncate">
                  {d.ip ? `${d.ip} · ` : ""}last used {relTime(d.lastUsedAt)} ·{" "}
                  {untilStr(d.expiresAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SCard>
  )
}
