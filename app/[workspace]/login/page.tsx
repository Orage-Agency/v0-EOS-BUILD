// ═══════════════════════════════════════════════════════════
// app/[workspace]/login/page.tsx
// ═══════════════════════════════════════════════════════════

"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { login, sendMagicLink, signInWithGoogle } from "@/app/actions/auth"

export default function LoginPage() {
  const params = useParams()
  const workspaceSlug = params.workspace as string

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await login(workspaceSlug, email, password, rememberMe)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!email) return setError("Enter your email first")
    setLoading(true)
    const result = await sendMagicLink(workspaceSlug, email)
    setLoading(false)
    if (result.error) setError(result.error)
    else setMagicSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000] relative overflow-hidden">
      {/* Atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 1200px 800px at 75% -10%, rgba(182,128,57,0.07) 0%, transparent 60%), radial-gradient(ellipse 800px 600px at -10% 100%, rgba(228,175,122,0.04) 0%, transparent 55%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] mx-auto px-6">
        {/* Brand */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-[2px] flex items-center justify-center font-bold text-black"
              style={{
                background: "linear-gradient(135deg, #B68039, #543C1C)",
                fontFamily: "Bebas Neue",
                letterSpacing: "0.05em",
              }}
            >
              O
            </div>
            <div
              className="text-[20px] tracking-[0.18em]"
              style={{ fontFamily: "Bebas Neue", color: "#E4AF7A" }}
            >
              ORAGE CORE
            </div>
          </div>
          <div className="text-[11px] text-[#8a7860] italic">Welcome back</div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039] transition-colors"
              placeholder="you@orage.agency"
            />
          </div>

          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039] transition-colors"
              placeholder="••••••••"
            />
          </div>

          <label className="flex items-center gap-2 text-[12px] text-[#FFE8C7] cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded-[2px] accent-[#B68039]"
            />
            Remember me for 30 days
          </label>

          {error && (
            <div className="px-4 py-3 bg-[rgba(194,84,80,0.1)] border-l-2 border-[#C25450] text-[12px] text-[#C25450]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[2px] text-black font-semibold text-[12px] tracking-[0.1em] uppercase transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #B68039, #E4AF7A)",
              fontFamily: "Bebas Neue",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-[rgba(182,128,57,0.18)]" />
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#8a7860]">or</span>
          <div className="flex-1 h-px bg-[rgba(182,128,57,0.18)]" />
        </div>

        {/* Google */}
        <button
          onClick={() => signInWithGoogle(workspaceSlug)}
          className="w-full py-3 rounded-[2px] border border-[rgba(182,128,57,0.18)] text-[#FFD69C] text-[12px] tracking-[0.1em] uppercase hover:border-[#B68039] transition-colors"
          style={{ fontFamily: "Bebas Neue" }}
        >
          Continue with Google
        </button>

        {/* Magic link fallback */}
        <div className="mt-6 text-center">
          {magicSent ? (
            <div className="text-[12px] text-[#6FAA6B]">Check your email for the magic link</div>
          ) : (
            <button
              onClick={handleMagicLink}
              className="text-[11px] text-[#8a7860] hover:text-[#E4AF7A] underline-offset-4 hover:underline transition-colors"
            >
              {"Can't sign in? Send me a magic link"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
