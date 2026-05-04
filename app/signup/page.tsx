// ═══════════════════════════════════════════════════════════
// app/signup/page.tsx — real customer signup flow
// Email + password is all that's required. A "display name" field is
// available but optional, and we derive a workspace name automatically
// so the form never errors on a blank field at the start.
// ═══════════════════════════════════════════════════════════

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signUpWorkspace } from "@/app/actions/auth"

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signUpWorkspace({ email, password, fullName })
    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push(`/${result.slug}`)
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

      <div className="relative z-10 w-full max-w-[460px] mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-3">
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
            <div className="text-[20px] tracking-[0.18em]" style={{ fontFamily: "Bebas Neue", color: "#E4AF7A" }}>
              ORAGE CORE
            </div>
          </div>
          <h1
            className="text-[28px]"
            style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.06em" }}
          >
            CREATE YOUR ACCOUNT
          </h1>
          <p className="text-[12px] text-[#8a7860] mt-1">
            Email and password — that's it. You can change everything else later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              autoComplete="email"
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Password (8+ characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
            />
          </div>

          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Display name <span className="text-[#5a4f3e] normal-case tracking-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              placeholder="Leave blank to use your email handle"
            />
          </div>

          {error && (
            <div className="px-4 py-3 bg-[rgba(194,84,80,0.1)] border-l-2 border-[#C25450] text-[12px] text-[#C25450]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[2px] text-black font-semibold text-[12px] tracking-[0.1em] uppercase disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #B68039, #E4AF7A)", fontFamily: "Bebas Neue" }}
          >
            {loading ? "Creating account…" : "Create account →"}
          </button>

          <p className="text-center text-[11px] text-[#8a7860] mt-4">
            Already have an account?{" "}
            <a href="/login" className="text-[#E4AF7A] hover:underline">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
