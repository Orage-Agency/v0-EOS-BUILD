"use client"

import { useEffect, useState, useTransition } from "react"
import Image from "next/image"
import { toast } from "sonner"
import {
  disableMfa,
  finishMfaEnrollment,
  listMfaFactors,
  startMfaEnrollment,
} from "@/app/actions/auth"
import { SCard } from "./ui"
import { cn } from "@/lib/utils"

type Mode = "loading" | "off" | "enrolling" | "on" | "disabling"

type Factor = { id: string; friendlyName: string }

export function TwoFactorCard() {
  const [mode, setMode] = useState<Mode>("loading")
  const [factors, setFactors] = useState<Factor[]>([])
  const [enrollment, setEnrollment] = useState<{
    factorId: string
    qrCode: string
    secret: string
  } | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function refresh() {
    const result = await listMfaFactors()
    if (!result.ok) {
      setMode("off")
      return
    }
    setFactors(result.factors)
    setMode(result.enabled ? "on" : "off")
  }

  useEffect(() => {
    refresh()
  }, [])

  function handleStartEnroll() {
    setError(null)
    setCode("")
    startTransition(async () => {
      const result = await startMfaEnrollment()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEnrollment({
        factorId: result.factorId,
        qrCode: result.qrCode,
        secret: result.secret,
      })
      setMode("enrolling")
    })
  }

  function handleConfirmEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollment) return
    setError(null)
    startTransition(async () => {
      const result = await finishMfaEnrollment(enrollment.factorId, code)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEnrollment(null)
      setCode("")
      toast("TWO-FACTOR ENABLED")
      await refresh()
    })
  }

  function handleStartDisable() {
    setError(null)
    setCode("")
    setMode("disabling")
  }

  function handleConfirmDisable(e: React.FormEvent) {
    e.preventDefault()
    const factor = factors[0]
    if (!factor) return
    setError(null)
    startTransition(async () => {
      const result = await disableMfa(factor.id, code)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setCode("")
      toast("TWO-FACTOR DISABLED")
      await refresh()
    })
  }

  return (
    <SCard title="TWO-FACTOR AUTHENTICATION">
      {mode === "loading" && (
        <div className="text-[12px] text-[#8a7860]">Loading…</div>
      )}

      {mode === "off" && (
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="text-[12px] text-text-muted max-w-[480px]">
            Add a second step to sign-in. Use any TOTP app — Authy, 1Password,
            Google Authenticator. Without it, anyone with your password can
            sign in.
          </div>
          <button
            type="button"
            onClick={handleStartEnroll}
            disabled={pending}
            className={cn(
              "px-4 py-1.5 font-display text-[10px] tracking-[0.18em] rounded-sm text-text-on-gold font-semibold transition-all",
              "hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(182,128,57,0.3)]",
              "disabled:opacity-50",
            )}
            style={{
              background:
                "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
            }}
          >
            {pending ? "STARTING…" : "ENABLE 2FA"}
          </button>
        </div>
      )}

      {mode === "enrolling" && enrollment && (
        <form onSubmit={handleConfirmEnroll} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="bg-white p-3 rounded-sm shrink-0">
              {enrollment.qrCode.startsWith("data:") ? (
                <Image
                  src={enrollment.qrCode}
                  alt="2FA QR code"
                  width={160}
                  height={160}
                  unoptimized
                />
              ) : (
                <div
                  className="w-[160px] h-[160px]"
                  dangerouslySetInnerHTML={{ __html: enrollment.qrCode }}
                />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2 text-[12px] text-text-muted">
              <p>
                <strong className="text-[#E4AF7A]">1.</strong> Scan the QR code
                in your authenticator app.
              </p>
              <p>
                <strong className="text-[#E4AF7A]">2.</strong> If you can&apos;t
                scan, paste this secret manually:
              </p>
              <div className="px-2 py-1.5 bg-bg-2 border border-border-orage rounded-sm font-mono text-[11px] text-[#FFD69C] break-all">
                {enrollment.secret}
              </div>
              <p>
                <strong className="text-[#E4AF7A]">3.</strong> Enter the
                6-digit code your app shows below.
              </p>
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 max-w-[200px]">
              <label
                className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-1.5"
                style={{ fontFamily: "Bebas Neue" }}
              >
                Verification code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                className="w-full px-3 py-2 bg-bg-2 border border-border-orage rounded-sm text-[13px] text-text-primary outline-none focus:border-gold-500/60 tracking-[0.4em] text-center"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={pending || code.length !== 6}
              className={cn(
                "px-4 py-2 font-display text-[10px] tracking-[0.18em] rounded-sm text-text-on-gold font-semibold",
                "disabled:opacity-50",
              )}
              style={{
                background:
                  "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
              }}
            >
              {pending ? "VERIFYING…" : "CONFIRM"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEnrollment(null)
                setMode("off")
              }}
              className="px-3 py-2 text-[11px] text-[#8a7860] hover:text-[#E4AF7A] border border-border-orage rounded-sm"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="px-3 py-2 border-l-2 border-danger bg-[rgba(194,84,80,0.08)] text-[12px] text-danger">
              {error}
            </div>
          )}
        </form>
      )}

      {mode === "on" && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-block px-2 py-0.5 font-display text-[9px] tracking-[0.18em] rounded-sm bg-[rgba(111,170,107,0.15)] text-success">
              ENABLED
            </span>
            <span className="text-[12px] text-text-secondary">
              {factors[0]?.friendlyName ?? "Authenticator app"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStartDisable}
            className="px-3 py-1.5 font-display text-[10px] tracking-[0.18em] rounded-sm text-[#C25450] hover:bg-[rgba(194,84,80,0.1)]"
          >
            DISABLE
          </button>
        </div>
      )}

      {mode === "disabling" && (
        <form onSubmit={handleConfirmDisable} className="space-y-3">
          <div className="text-[12px] text-text-muted max-w-[480px]">
            Enter your current 2FA code to confirm. This removes the factor
            permanently — you&apos;ll be able to sign in with just your
            password.
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 max-w-[200px]">
              <label
                className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-1.5"
                style={{ fontFamily: "Bebas Neue" }}
              >
                Confirmation code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                autoFocus
                className="w-full px-3 py-2 bg-bg-2 border border-border-orage rounded-sm text-[13px] text-text-primary outline-none focus:border-gold-500/60 tracking-[0.4em] text-center"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={pending || code.length !== 6}
              className="px-4 py-2 font-display text-[10px] tracking-[0.18em] rounded-sm text-[#C25450] border border-[rgba(194,84,80,0.4)] hover:bg-[rgba(194,84,80,0.1)] disabled:opacity-50"
            >
              {pending ? "REMOVING…" : "CONFIRM REMOVE"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("on")
                setError(null)
                setCode("")
              }}
              className="px-3 py-2 text-[11px] text-[#8a7860] hover:text-[#E4AF7A] border border-border-orage rounded-sm"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="px-3 py-2 border-l-2 border-danger bg-[rgba(194,84,80,0.08)] text-[12px] text-danger">
              {error}
            </div>
          )}
        </form>
      )}
    </SCard>
  )
}
