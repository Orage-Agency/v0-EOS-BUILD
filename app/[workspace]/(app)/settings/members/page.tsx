// ═══════════════════════════════════════════════════════════
// app/[workspace]/settings/members/page.tsx
// Generate + copy invite links (no email service required)
// ═══════════════════════════════════════════════════════════

"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { createInvite, revokeInvite } from "@/app/actions/auth"
import { createClient } from "@/lib/supabase/client"

type Member = {
  id: string
  role: string
  joined_at: string | null
  user: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

type Invite = {
  id: string
  email: string
  role: string
  token: string
  expires_at: string
}

export default function MembersPage() {
  const params = useParams()
  const workspaceSlug = params.workspace as string

  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "leader" | "member" | "viewer">("member")
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const loadData = useCallback(async () => {
    const supabase = createClient()

    const { data: ws } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", workspaceSlug)
      .single()

    if (!ws) return

    // Two-step query — Supabase's foreign-table alias join
    // (`user:profiles(...)`) was returning a 400 in production because
    // the FK relationship between workspace_memberships.user_id and
    // profiles.id isn't reliably exposed via PostgREST. Fetching memberships
    // first and then profiles by id IN (...) avoids the dependency.
    const { data: rawMemberships } = await supabase
      .from("workspace_memberships")
      .select("id, role, joined_at, user_id")
      .eq("workspace_id", ws.id)

    const memberRows = (rawMemberships ?? []) as Array<{
      id: string
      role: string
      joined_at: string | null
      user_id: string
    }>

    let merged: Member[] = []
    if (memberRows.length > 0) {
      const ids = memberRows.map((m) => m.user_id).filter(Boolean)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .in("id", ids)
      const byId = new Map(
        ((profiles ?? []) as Array<{
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
        }>).map((p) => [p.id, p]),
      )
      merged = memberRows.map((m) => ({
        id: m.id,
        role: m.role,
        joined_at: m.joined_at,
        user: byId.get(m.user_id) ?? null,
      }))
    }

    const { data: i } = await supabase
      .from("workspace_invites")
      .select("*")
      .eq("workspace_id", ws.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    setMembers(merged)
    setInvites((i as unknown as Invite[]) ?? [])
  }, [workspaceSlug])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    const result = await createInvite(workspaceSlug, inviteEmail, inviteRole)
    if (result.success && result.link) {
      setGeneratedLink(result.link)
      setInviteEmail("")
      loadData()
    } else {
      alert(result.error)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this invite? The link will no longer work.")) return
    await revokeInvite(workspaceSlug, id)
    loadData()
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-[32px]"
            style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.06em" }}
          >
            MEMBERS
          </h1>
          <p className="text-[12px] text-[#8a7860]">Manage your workspace team</p>
        </div>
        <button
          onClick={() => {
            setShowInviteForm(true)
            setGeneratedLink(null)
          }}
          className="px-5 py-2 text-[11px] uppercase tracking-[0.1em] text-black rounded-[2px]"
          style={{ background: "linear-gradient(135deg, #B68039, #E4AF7A)", fontFamily: "Bebas Neue" }}
        >
          + Invite member
        </button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="mb-8 p-6 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px]">
          {generatedLink ? (
            <div>
              <div
                className="text-[11px] uppercase tracking-[0.18em] text-[#6FAA6B] mb-3"
                style={{ fontFamily: "Bebas Neue" }}
              >
                Invite link generated
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  readOnly
                  value={generatedLink}
                  className="flex-1 px-4 py-2 bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[12px] text-[#FFD69C] font-mono"
                />
                <button
                  onClick={() => copyToClipboard(generatedLink)}
                  className="px-4 py-2 bg-[#B68039] text-black text-[11px] uppercase tracking-[0.1em] rounded-[2px]"
                  style={{ fontFamily: "Bebas Neue" }}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[11px] text-[#8a7860]">
                Send this link to <strong className="text-[#E4AF7A]">the invitee</strong>. They&apos;ll set
                their password and join. The link expires in 14 days.
              </p>
              <button
                onClick={() => {
                  setShowInviteForm(false)
                  setGeneratedLink(null)
                }}
                className="mt-4 text-[11px] text-[#8a7860] hover:text-[#E4AF7A]"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreateInvite} className="space-y-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as "admin" | "leader" | "member" | "viewer")}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] text-[#FFD69C]"
              >
                <option value="admin">Admin · Manage rocks, issues, scorecard</option>
                <option value="leader">Leader · Run own department</option>
                <option value="member">Member · Default for team</option>
                <option value="viewer">Viewer · Read-only</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-5 py-2 text-[11px] uppercase tracking-[0.1em] text-black rounded-[2px]"
                  style={{ background: "linear-gradient(135deg, #B68039, #E4AF7A)", fontFamily: "Bebas Neue" }}
                >
                  Generate link
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-5 py-2 text-[11px] uppercase tracking-[0.1em] text-[#8a7860] border border-[rgba(182,128,57,0.18)] rounded-[2px]"
                  style={{ fontFamily: "Bebas Neue" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="mb-8">
          <div
            className="text-[10px] uppercase tracking-[0.22em] text-[#8a7860] mb-3"
            style={{ fontFamily: "Bebas Neue" }}
          >
            Pending invites · {invites.length}
          </div>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="p-4 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] flex items-center justify-between"
              >
                <div>
                  <div className="text-[13px] text-[#FFD69C]">{inv.email}</div>
                  <div
                    className="text-[11px] text-[#8a7860] uppercase tracking-[0.1em]"
                    style={{ fontFamily: "Bebas Neue" }}
                  >
                    {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      copyToClipboard(`${window.location.origin}/accept-invite?token=${inv.token}`)
                    }
                    className="px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-[#E4AF7A] border border-[rgba(182,128,57,0.18)] rounded-[2px] hover:border-[#B68039]"
                    style={{ fontFamily: "Bebas Neue" }}
                  >
                    Copy link
                  </button>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-[#C25450] hover:bg-[rgba(194,84,80,0.1)] rounded-[2px]"
                    style={{ fontFamily: "Bebas Neue" }}
                  >
                    Revoke
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div>
        <div
          className="text-[10px] uppercase tracking-[0.22em] text-[#8a7860] mb-3"
          style={{ fontFamily: "Bebas Neue" }}
        >
          Members · {members.length}
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="p-4 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px] flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-[#262019] flex items-center justify-center text-[#E4AF7A] font-semibold">
                {m.user?.full_name?.[0] ?? m.user?.email?.[0]}
              </div>
              <div className="flex-1">
                <div className="text-[13px] text-[#FFD69C]">{m.user?.full_name ?? m.user?.email}</div>
                <div className="text-[11px] text-[#8a7860]">{m.user?.email}</div>
              </div>
              <div
                className="text-[10px] uppercase tracking-[0.18em] text-[#E4AF7A] px-3 py-1 border border-[rgba(182,128,57,0.18)] rounded-[2px]"
                style={{ fontFamily: "Bebas Neue" }}
              >
                {m.role}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
