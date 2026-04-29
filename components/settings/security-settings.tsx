"use client"

import { toast } from "sonner"
import { API_KEYS, useSettingsStore } from "@/lib/settings-store"
import { OrageToggle } from "@/components/orage/toggle"
import {
  SectionBlock,
  SCard,
  FieldRow,
  SelectField,
  TextareaField,
} from "./ui"
import { ChangePasswordCard } from "./change-password-card"
import { cn } from "@/lib/utils"

export function SecuritySettings() {
  const security = useSettingsStore((s) => s.security)
  const toggleTwoFactor = useSettingsStore((s) => s.toggleTwoFactor)
  const toggleSSO = useSettingsStore((s) => s.toggleSSO)
  const setSessionTimeout = useSettingsStore((s) => s.setSessionTimeout)
  const setIPAllowlist = useSettingsStore((s) => s.setIPAllowlist)
  const toggleKeyReveal = useSettingsStore((s) => s.toggleKeyReveal)

  return (
    <SectionBlock
      title="SECURITY & API"
      description="Authentication, session controls, and API access keys"
    >
      <ChangePasswordCard />

      <SCard title="AUTHENTICATION">
        <FieldRow
          name="Two-Factor Authentication"
          hint="Required for Founder + Admin · TOTP via Authy/1Password"
          control={
            <div className="flex items-center gap-2.5">
              <OrageToggle
                on={security.twoFactor}
                onChange={toggleTwoFactor}
                label="Two-factor authentication"
              />
              <span
                className={cn(
                  "text-xs font-display tracking-[0.15em]",
                  security.twoFactor ? "text-success" : "text-text-muted",
                )}
              >
                {security.twoFactor ? "REQUIRED" : "DISABLED"}
              </span>
            </div>
          }
        />
        <FieldRow
          name="SSO · Google Workspace"
          hint="Single sign-on via Google · uses Orage agency identity"
          control={
            <div className="flex items-center gap-2.5">
              <OrageToggle
                on={security.ssoGoogle}
                onChange={toggleSSO}
                label="SSO Google"
              />
              <span className="text-xs text-text-secondary">
                {security.ssoGoogle
                  ? "Configured · orage.agency"
                  : "Not configured"}
              </span>
            </div>
          }
        />
        <FieldRow
          name="Session Timeout"
          hint="Auto-logout after inactivity"
          control={
            <SelectField
              value={security.sessionTimeout}
              onChange={(e) =>
                setSessionTimeout(
                  e.target.value as typeof security.sessionTimeout,
                )
              }
              className="max-w-[240px]"
            >
              <option value="30d">30 days (recommended)</option>
              <option value="7d">7 days</option>
              <option value="24h">24 hours</option>
              <option value="never">Never</option>
            </SelectField>
          }
        />
        <FieldRow
          name="IP Allowlist"
          hint="Restrict access to specific IPs · CIDR notation supported"
          control={
            <TextareaField
              value={security.ipAllowlist}
              onChange={(e) => setIPAllowlist(e.target.value)}
              placeholder="Enter one CIDR per line · e.g. 192.168.1.0/24"
              className="font-mono text-xs"
            />
          }
        />
      </SCard>

      <SCard
        title="API KEYS"
        action={
          <button
            type="button"
            onClick={() => toast("NEW KEY CREATED")}
            className="px-3 py-1.5 font-display text-[9px] tracking-[0.18em] rounded-sm text-text-on-gold font-semibold transition-all hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(182,128,57,0.3)]"
            style={{
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
            }}
          >
            + NEW KEY
          </button>
        }
      >
        <div className="flex flex-col gap-2.5">
          {API_KEYS.map((k) => {
            const revealed = security.revealedKeyId === k.id
            return (
              <div key={k.id}>
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <div className="text-[13px] text-text-primary font-medium">
                    {k.name}
                  </div>
                  <span
                    className={cn(
                      "inline-block px-2 py-0.5 font-display text-[9px] tracking-[0.18em] rounded-sm",
                      k.status === "active"
                        ? "bg-[rgba(111,170,107,0.15)] text-success"
                        : "bg-[rgba(228,175,122,0.15)] text-gold-400",
                    )}
                  >
                    {k.status === "active" ? "ACTIVE" : "DEV"}
                  </span>
                  <span className="text-[10px] text-text-muted ml-auto font-mono">
                    CREATED {k.createdAt} · LAST USED {k.lastUsed}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-3 bg-bg-2 border border-border-orage rounded-sm font-mono text-xs">
                  <span className="text-text-dim">{k.prefix}</span>
                  <span className="flex-1 text-text-secondary tracking-[0.05em] text-[11px]">
                    {revealed
                      ? "0xJF8A3MHK2P4NE9R7TVQXY9CDLPMRUW"
                      : "•".repeat(28)}
                  </span>
                  <KeyIcon
                    title={revealed ? "Hide" : "Reveal"}
                    onClick={() => toggleKeyReveal(k.id)}
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </KeyIcon>
                  <KeyIcon
                    title="Copy"
                    onClick={() => toast(`${k.name.toUpperCase()} · COPIED`)}
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </KeyIcon>
                  <KeyIcon
                    title="Rotate"
                    onClick={() => toast(`${k.name.toUpperCase()} · ROTATED`)}
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </KeyIcon>
                </div>
              </div>
            )
          })}
        </div>
      </SCard>
    </SectionBlock>
  )
}

function KeyIcon({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="w-7 h-7 rounded-sm bg-bg-3 flex items-center justify-center text-text-muted hover:text-gold-400 transition-colors shrink-0"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  )
}
