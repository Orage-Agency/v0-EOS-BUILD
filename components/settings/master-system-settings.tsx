"use client"

import { toast } from "sonner"
import { CRON_JOBS, useSettingsStore } from "@/lib/settings-store"
import { OrageToggle } from "@/components/orage/toggle"
import {
  SectionBlock,
  SCard,
  FieldRow,
  InputField,
  SelectField,
  TextareaField,
  PrimaryButton,
} from "./ui"
import { cn } from "@/lib/utils"

const FEATURE_FLAGS: {
  key: keyof ReturnType<
    typeof useSettingsStore.getState
  >["masterSystem"]["featureFlags"]
  name: string
  hint: string
}[] = [
  {
    key: "aiInlineNotes",
    name: "AI Inline in Notes",
    hint: "/ai slash command in note editor · all tenants",
  },
  {
    key: "l10AutoSummary",
    name: "L10 Auto-Summary",
    hint: "AI generates meeting recap automatically",
  },
  {
    key: "voiceModeBeta",
    name: "Voice Mode (Beta)",
    hint: "Voice input for AI chat · currently in beta",
  },
]

export function MasterSystemSettings() {
  const ms = useSettingsStore((s) => s.masterSystem)
  const updateMasterSystem = useSettingsStore((s) => s.updateMasterSystem)
  const toggleFeatureFlag = useSettingsStore((s) => s.toggleFeatureFlag)
  const broadcast = useSettingsStore((s) => s.broadcastAnnouncement)

  return (
    <SectionBlock
      title="MASTER · SYSTEM CONFIG"
      titleClassName="text-gold-400"
      description="Cross-tenant configuration · only visible to master role"
    >
      <SCard title="DEFAULT TENANT CONFIG" variant="master">
        <FieldRow
          name="Default Seat Limit"
          hint="Applied to new tenants on provision"
          control={
            <InputField
              type="number"
              value={ms.defaultSeatLimit}
              onChange={(e) =>
                updateMasterSystem({
                  defaultSeatLimit: Number(e.target.value) || 0,
                })
              }
              className="max-w-[120px]"
            />
          }
        />
        <FieldRow
          name="V/TO Seed Template"
          hint="Default V/TO scaffold for new tenants"
          control={
            <SelectField
              value={ms.vtoSeedTemplate}
              onChange={(e) =>
                updateMasterSystem({
                  vtoSeedTemplate: e.target
                    .value as typeof ms.vtoSeedTemplate,
                })
              }
              className="max-w-[300px]"
            >
              <option value="service">Service Business (default)</option>
              <option value="agency">Agency</option>
              <option value="saas">SaaS</option>
              <option value="blank">Blank</option>
            </SelectField>
          }
        />
        <FieldRow
          name="Default AI Model"
          hint="All new tenants use this model unless overridden"
          control={
            <SelectField
              value={ms.defaultAIModel}
              onChange={(e) =>
                updateMasterSystem({
                  defaultAIModel: e.target.value as typeof ms.defaultAIModel,
                })
              }
              className="max-w-[300px]"
            >
              <option value="claude-opus-4.7">Claude Opus 4.7</option>
              <option value="claude-sonnet-4.6">Claude Sonnet 4.6</option>
              <option value="claude-haiku-4.5">Claude Haiku 4.5</option>
            </SelectField>
          }
        />
      </SCard>

      <SCard
        title="SCHEDULED JOBS · CRON STATUS"
        variant="master"
        action={
          <span className="text-[10px] text-text-muted font-mono">INNGEST</span>
        }
      >
        <div
          className="grid gap-2.5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          }}
        >
          {CRON_JOBS.map((c) => (
            <div
              key={c.id}
              className="p-3 bg-bg-3 border border-border-orage rounded-sm transition-colors hover:border-gold-500"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="text-xs text-text-primary font-medium flex-1">
                  {c.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      c.status === "running" && "bg-success shadow-[0_0_5px_var(--success)]",
                      c.status === "waiting" && "bg-text-muted",
                      c.status === "failing" && "bg-danger shadow-[0_0_5px_var(--danger)]",
                    )}
                  />
                  <span className="font-display text-[9px] tracking-[0.15em] text-text-muted">
                    {c.status === "running"
                      ? "RUNNING"
                      : c.status === "waiting"
                        ? "WAITING"
                        : "FAILING"}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-text-muted font-mono">
                {c.schedule} · {c.meta}
              </div>
            </div>
          ))}
        </div>
      </SCard>

      <SCard title="FEATURE FLAGS" variant="master">
        {FEATURE_FLAGS.map((f) => (
          <FieldRow
            key={f.key}
            name={f.name}
            hint={f.hint}
            control={
              <OrageToggle
                on={ms.featureFlags[f.key]}
                onChange={() => toggleFeatureFlag(f.key)}
                label={f.name}
              />
            }
          />
        ))}
      </SCard>

      <SCard title="SYSTEM ANNOUNCEMENT" variant="master">
        <FieldRow
          full
          control={
            <>
              <TextareaField
                value={ms.announcement}
                onChange={(e) =>
                  updateMasterSystem({ announcement: e.target.value })
                }
                placeholder="Optional banner shown to all tenants · markdown supported · use sparingly"
                rows={3}
              />
              <div className="flex justify-between items-center mt-2 gap-3 flex-wrap">
                <div className="text-[11px] text-text-muted">
                  Last broadcast: {ms.lastBroadcast}
                </div>
                <PrimaryButton
                  onClick={() => {
                    broadcast()
                    toast("ANNOUNCEMENT BROADCAST")
                  }}
                  disabled={!ms.announcement.trim()}
                >
                  Broadcast
                </PrimaryButton>
              </div>
            </>
          }
        />
      </SCard>
    </SectionBlock>
  )
}
