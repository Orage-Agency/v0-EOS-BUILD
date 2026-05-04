"use client"

import { useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { useParams } from "next/navigation"
import { useSettingsStore, BRAND_COLORS } from "@/lib/settings-store"
import { useOnboardingStore } from "@/lib/onboarding-store"
import {
  uploadWorkspaceLogo,
  removeWorkspaceLogo,
} from "@/app/actions/workspace-logo"
import {
  SectionBlock,
  SCard,
  FieldRow,
  InputField,
  SelectField,
  SecondaryButton,
  FormFooter,
} from "./ui"
import { cn } from "@/lib/utils"

export function WorkspaceSettings() {
  const workspace = useSettingsStore((s) => s.workspace)
  const updateWorkspace = useSettingsStore((s) => s.updateWorkspace)
  const setBrandColor = useSettingsStore((s) => s.setBrandColor)
  const params = useParams()
  const workspaceSlug = (params?.workspace as string) ?? ""
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [pending, startUpload] = useTransition()

  function pickFile() {
    fileInputRef.current?.click()
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = "" // allow re-selecting the same file
    startUpload(async () => {
      const fd = new FormData()
      fd.append("file", file)
      const res = await uploadWorkspaceLogo(workspaceSlug, fd)
      if (res.ok && res.url) {
        setLogoUrl(res.url)
        toast.success("Logo uploaded")
      } else {
        toast.error(res.error ?? "Upload failed")
      }
    })
  }

  function clearLogo() {
    startUpload(async () => {
      const res = await removeWorkspaceLogo(workspaceSlug)
      if (res.ok) {
        setLogoUrl(null)
        toast.success("Logo removed")
      } else {
        toast.error(res.error ?? "Remove failed")
      }
    })
  }

  return (
    <SectionBlock
      title="GENERAL"
      description="Workspace identity · how Orage Core looks and identifies for your team"
    >
      <SCard title="IDENTITY">
        <FieldRow
          name="Workspace Logo"
          hint="Used in sidebar, exports, and emails. PNG / JPEG / SVG / WebP, under 2 MB."
          control={
            <div className="flex items-center gap-3.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={onFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={pickFile}
                disabled={pending}
                className="relative w-20 h-20 rounded-md text-text-on-gold flex items-center justify-center font-display text-[18px] font-bold tracking-[0.05em] border border-border-strong group cursor-pointer overflow-hidden disabled:opacity-60"
                style={{
                  background: logoUrl
                    ? "transparent"
                    : "linear-gradient(135deg, var(--gold-500), var(--gold-700))",
                }}
                aria-label="Change workspace logo"
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt="Workspace logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  workspace.name?.slice(0, 2).toUpperCase() ?? "OR"
                )}
                <span className="absolute inset-0 rounded-md flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity font-sans text-[10px] tracking-[0.1em] text-gold-400 uppercase font-medium">
                  {pending ? "Uploading…" : "Change"}
                </span>
              </button>
              <div className="flex flex-col gap-1.5 items-start">
                <SecondaryButton onClick={pickFile}>
                  {pending ? "Uploading…" : "Upload Image"}
                </SecondaryButton>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={clearLogo}
                    disabled={pending}
                    className="text-[11px] text-text-muted hover:text-danger transition-colors disabled:opacity-60"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          }
        />
        <FieldRow
          name="Workspace Name"
          hint="Displayed everywhere users see your tenant"
          control={
            <InputField
              value={workspace.name}
              onChange={(e) => updateWorkspace({ name: e.target.value })}
            />
          }
        />
        <FieldRow
          name="Slug · Subdomain"
          hint="Your URL · changing breaks shared links"
          control={
            <div className="flex items-center gap-1.5">
              <InputField
                value={workspace.slug}
                onChange={(e) => updateWorkspace({ slug: e.target.value })}
                className="flex-1"
              />
              <span className="font-mono text-xs text-text-muted shrink-0">
                .core.orage.agency
              </span>
            </div>
          }
        />
        <FieldRow
          name="Time Zone"
          hint="Default for all members · meetings + briefings respect this"
          control={
            <SelectField
              value={workspace.timezone}
              onChange={(e) => updateWorkspace({ timezone: e.target.value })}
            >
              <option value="America/Mexico_City">
                America/Mexico_City (CST · UTC−6)
              </option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Los_Angeles">
                America/Los_Angeles (PST)
              </option>
            </SelectField>
          }
        />
        <FieldRow
          name="Brand Color"
          hint="Accent throughout your workspace · gold is recommended"
          control={
            <div className="flex gap-2 flex-wrap">
              {BRAND_COLORS.map((c) => {
                const selected = workspace.brandColor === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setBrandColor(c.id)
                      toast("BRAND COLOR UPDATED")
                    }}
                    aria-label={c.label}
                    aria-pressed={selected}
                    className={cn(
                      "w-8 h-8 rounded-sm transition-transform hover:scale-110",
                      selected
                        ? "outline outline-2 outline-gold-400 outline-offset-2"
                        : "outline outline-2 outline-transparent outline-offset-2",
                    )}
                    style={{
                      background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
                    }}
                  />
                )
              })}
            </div>
          }
        />
      </SCard>

      <SCard title="EOS DEFAULTS">
        <FieldRow
          name="L10 Meeting Day"
          hint="Default L10 cadence for new meetings"
          control={
            <SelectField
              value={workspace.l10Day}
              onChange={(e) => updateWorkspace({ l10Day: e.target.value })}
            >
              <option value="monday-9">Monday · 9:00 AM</option>
              <option value="tuesday-9">Tuesday · 9:00 AM</option>
              <option value="wednesday-10">Wednesday · 10:00 AM</option>
            </SelectField>
          }
        />
        <FieldRow
          name="Quarter Start"
          hint="When does Q1 begin · used for Rocks expiration"
          control={
            <SelectField
              value={workspace.quarterStart}
              onChange={(e) =>
                updateWorkspace({ quarterStart: e.target.value })
              }
            >
              <option value="jan-1">January 1 (calendar)</option>
              <option value="apr-1">April 1 (Q2-aligned)</option>
              <option value="custom">Custom…</option>
            </SelectField>
          }
        />
        <FieldRow
          name="1:1 Default Cadence"
          hint="Auto-suggested cadence for new manager-report 1:1s"
          control={
            <SelectField
              value={workspace.oneOnOneCadence}
              onChange={(e) =>
                updateWorkspace({ oneOnOneCadence: e.target.value })
              }
            >
              <option value="biweekly">Bi-weekly</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </SelectField>
          }
        />
      </SCard>

      <SCard title="ONBOARDING">
        <FieldRow
          name="Re-run Onboarding"
          hint="Walks you back through the 7 setup steps. Existing rocks, values, and goals are kept — the wizard adds, doesn&apos;t replace."
          control={
            <SecondaryButton
              onClick={() => {
                useOnboardingStore.getState().reopen()
                toast("ONBOARDING REOPENED")
              }}
            >
              Open Wizard →
            </SecondaryButton>
          }
        />
      </SCard>

      <FormFooter onSave={() => toast("SETTINGS SAVED")} />
    </SectionBlock>
  )
}
