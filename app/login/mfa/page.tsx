"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { listMfaFactors, verifyMfaForLogin, logout } from "@/app/actions/auth"

export default function LoginMfaPage() {
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const result = await listMfaFactors()
      if (cancelled) return
      if (!result.ok || result.factors.length === 0) {
        // No verified factors → user shouldn't be here. Send them home.
        window.location.href = "/login"
        return
      }
      setFactorId(result.factors[0].id)
      setBootstrapping(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setLoading(true)
    setError(null)
    const result = await verifyMfaForLogin(factorId, code)
    if (result && !result.ok) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleCancel() {
    await logout()
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-[#8a7860] text-[12px]">Loading…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 1200px 800px at 75% -10%, rgba(182,128,57,0.07) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] mx-auto px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-[2px] flex items-center justify-center font-bold text-black"
              style={{
                background: "linear-gradient(135deg, #B68039, #543C1C)",
                fontFamily: "Bebas Neue",
              }}
            >
              O
            </div>
            <div className="text-[20px] tracking-[0.18em]" style={{ fontFamily: "Bebas Neue", color: "#E4AF7A" }}>
              ORAGE CORE
            </div>
          </div>
          <h1
            className="text-[24px]"
            style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.06em" }}
          >
            TWO-FACTOR CODE
          </h1>
          <p className="text-[12px] text-[#8a7860] mt-1">
            Open your authenticator app and enter the current 6-digit code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Code
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
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039] tracking-[0.5em] text-center text-[20px]"
              placeholder="000000"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-[rgba(194,84,80,0.1)] border-l-2 border-[#C25450] text-[12px] text-[#C25450]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full py-3 rounded-[2px] text-black font-semibold text-[12px] tracking-[0.1em] uppercase disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #B68039, #E4AF7A)",
              fontFamily: "Bebas Neue",
            }}
          >
            {loading ? "Verifying…" : "Verify"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleCancel}
              className="text-[11px] text-[#8a7860] hover:text-[#E4AF7A] underline-offset-4 hover:underline"
            >
              Cancel and sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
