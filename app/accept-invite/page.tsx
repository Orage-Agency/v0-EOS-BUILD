// ═══════════════════════════════════════════════════════════
// app/accept-invite/page.tsx — token-based invite acceptance
// ═══════════════════════════════════════════════════════════

"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { acceptInvite } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"

type InviteData = {
  email: string
  role: string
  status: string
  expires_at: string
  workspace: { name: string; slug: string }
}

/**
 * The page is wrapped in a Suspense boundary because Next 16 forces every
 * `useSearchParams()` consumer to bail out of static rendering. Without the
 * boundary the build aborts with the "missing-suspense-with-csr-bailout"
 * prerender error.
 */
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<InviteSkeleton />}>
      <AcceptInviteForm />
    </Suspense>
  )
}

function InviteSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-[#8a7860] text-[12px]">Loading invite&hellip;</div>
    </div>
  )
}

function AcceptInviteForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [invite, setInvite] = useState<InviteData | null>(null)
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!token) return setError("Missing invite token")
      const supabase = createClient()
      const { data } = await supabase
        .from("workspace_invites")
        .select("email, role, status, expires_at, workspace:workspaces(name, slug)")
        .eq("token", token)
        .single()
      if (!data) return setError("Invite not found")
      if (data.status !== "pending") return setError("This invite has already been used")
      if (new Date(data.expires_at) < new Date()) return setError("This invite has expired")
      setInvite(data as unknown as InviteData)
    }
    load()
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setLoading(true)
    setError(null)
    const result = await acceptInvite(token, password, fullName)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // Otherwise redirects via server action
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-center px-6">
        <div className="max-w-md">
          <div className="text-[32px] mb-3" style={{ fontFamily: "Bebas Neue", color: "#C25450" }}>
            INVITE INVALID
          </div>
          <p className="text-[#FFE8C7] text-[14px]">{error}</p>
          <p className="text-[12px] text-[#8a7860] mt-4">Ask your admin for a new invite link.</p>
        </div>
      </div>
    )
  }

  if (!invite) {
    return <InviteSkeleton />
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
          <div
            className="text-[11px] uppercase tracking-[0.22em] text-[#B68039] mb-2"
            style={{ fontFamily: "Bebas Neue" }}
          >
            {"You're invited"}
          </div>
          <div
            className="text-[28px] mb-2"
            style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.04em" }}
          >
            JOIN {invite.workspace.name.toUpperCase()}
          </div>
          <div className="text-[12px] text-[#FFE8C7]">
            Invited as{" "}
            <span
              className="text-[#E4AF7A] uppercase"
              style={{ fontFamily: "Bebas Neue", letterSpacing: "0.1em" }}
            >
              {invite.role}
            </span>
          </div>
          <div className="text-[11px] text-[#8a7860] mt-1">{invite.email}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
            />
          </div>

          <div>
            <label
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Set password (8+ characters)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
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
            {loading ? "Joining…" : "Accept & join"}
          </button>
        </form>
      </div>
    </div>
  )
}
