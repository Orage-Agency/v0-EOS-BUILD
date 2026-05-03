"use client"

import { useState, useTransition } from "react"
import { saveSsoConfig, type SsoConfig } from "@/app/actions/sso"
import { toast } from "sonner"

export function SsoSettings({
  workspaceSlug,
  initial,
}: {
  workspaceSlug: string
  initial: SsoConfig
}) {
  const [providerId, setProviderId] = useState(initial.providerId ?? "")
  const [providerType, setProviderType] = useState<"saml" | "oidc" | "">(
    initial.providerType ?? "",
  )
  const [displayName, setDisplayName] = useState(initial.displayName ?? "")
  const [enforced, setEnforced] = useState(initial.enforced)
  const [domainsText, setDomainsText] = useState(
    initial.allowedDomains.join(", "),
  )
  const [pending, startTransition] = useTransition()

  function handleSave() {
    const allowedDomains = domainsText
      .split(/[,\s]+/)
      .map((d) => d.trim())
      .filter(Boolean)
    startTransition(async () => {
      const res = await saveSsoConfig(workspaceSlug, {
        providerId: providerId.trim() || null,
        providerType: (providerType || null) as "saml" | "oidc" | null,
        displayName: displayName.trim() || null,
        enforced,
        allowedDomains,
      })
      if (res.ok) toast("SSO CONFIG SAVED")
      else toast.error(res.error ?? "Save failed")
    })
  }

  return (
    <div className="p-8 max-w-3xl">
      <header className="mb-8">
        <h1
          className="text-[32px]"
          style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.06em" }}
        >
          SINGLE SIGN-ON
        </h1>
        <p className="text-[12px] text-[#8a7860]">
          Route members on your domain through your identity provider.
        </p>
      </header>

      <section className="mb-8 p-5 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] text-[#E4AF7A] mb-1"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Provider
            </div>
            <p className="text-[12px] text-[#8a7860]">
              Configure your identity provider in Supabase Auth first, then paste
              the resulting provider ID here.
            </p>
          </div>
          <a
            href="https://supabase.com/docs/guides/auth/sso/auth-sso-saml"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] uppercase tracking-[0.18em] text-[#E4AF7A] underline"
            style={{ fontFamily: "Bebas Neue" }}
          >
            Supabase docs
          </a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-1"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Provider type
            </span>
            <select
              value={providerType}
              onChange={(e) => setProviderType(e.target.value as "saml" | "oidc" | "")}
              className="w-full bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[13px] text-[#FFD69C]"
            >
              <option value="">— Choose —</option>
              <option value="saml">SAML 2.0</option>
              <option value="oidc">OpenID Connect</option>
            </select>
          </label>
          <label className="block">
            <span
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-1"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Display label
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Acme Identity"
              className="w-full bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[13px] text-[#FFD69C]"
            />
          </label>
          <label className="md:col-span-2 block">
            <span
              className="block text-[10px] uppercase tracking-[0.18em] text-[#8a7860] mb-1"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Supabase provider ID
            </span>
            <input
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[13px] text-[#FFD69C] font-mono"
            />
          </label>
        </div>
      </section>

      <section className="mb-8 p-5 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px]">
        <div
          className="text-[11px] uppercase tracking-[0.18em] text-[#E4AF7A] mb-2"
          style={{ fontFamily: "Bebas Neue" }}
        >
          Email domains
        </div>
        <p className="text-[12px] text-[#8a7860] mb-3">
          Comma- or whitespace-separated. Members whose email matches one of
          these domains will be required to sign in via SSO when enforcement is
          on.
        </p>
        <input
          value={domainsText}
          onChange={(e) => setDomainsText(e.target.value)}
          placeholder="acme.com, acme.co.uk"
          className="w-full bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[13px] text-[#FFD69C] font-mono"
        />
      </section>

      <section className="mb-8 p-5 bg-[#151515] border border-[rgba(182,128,57,0.18)] rounded-[2px]">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enforced}
            onChange={(e) => setEnforced(e.target.checked)}
            className="w-4 h-4 accent-[#B68039]"
          />
          <div>
            <div
              className="text-[11px] uppercase tracking-[0.18em] text-[#E4AF7A]"
              style={{ fontFamily: "Bebas Neue" }}
            >
              Enforce SSO for matching domains
            </div>
            <div className="text-[12px] text-[#8a7860]">
              Password and magic-link sign-in will be rejected for those users.
            </div>
          </div>
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-5 py-2 text-[11px] uppercase tracking-[0.1em] text-black rounded-[2px] disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, #B68039, #E4AF7A)",
            fontFamily: "Bebas Neue",
          }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {initial.updatedAt && (
          <span className="text-[10px] text-[#8a7860] font-mono">
            Last updated {new Date(initial.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
