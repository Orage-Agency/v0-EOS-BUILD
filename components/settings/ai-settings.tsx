"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { TenantLink as Link } from "@/components/tenant-link"
import { useSettingsStore } from "@/lib/settings-store"
import { OrageToggle } from "@/components/orage/toggle"
import { SectionBlock, SCard, FieldRow, SelectField } from "./ui"
import {
  saveAISettings,
  type AIModelId,
  type AISettings as AISettingsShape,
} from "@/app/actions/ai-settings"

type Props = {
  workspaceSlug: string
  initial: AISettingsShape
}

export function AISettings({ workspaceSlug, initial }: Props) {
  const [settings, setSettings] = useState<AISettingsShape>(initial)
  const [pending, startTransition] = useTransition()
  const briefings = useSettingsStore((s) => s.ai.briefings)
  const toggleBriefing = useSettingsStore((s) => s.toggleBriefing)

  function persist(patch: Partial<AISettingsShape>) {
    setSettings((cur) => ({ ...cur, ...patch }))
    startTransition(async () => {
      const res = await saveAISettings(workspaceSlug, patch)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("AI settings saved", { duration: 1200 })
    })
  }

  return (
    <SectionBlock
      title="AI IMPLEMENTER"
      description="Configure capabilities, briefings, and how the AI participates in your business · Founder only"
    >
      <SCard title="MODEL & CONTEXT">
        <FieldRow
          name="Default Model"
          hint={
            pending
              ? "Saving…"
              : "Used for all AI Implementer interactions · changes take effect immediately"
          }
          control={
            <SelectField
              value={settings.model}
              onChange={(e) =>
                persist({ model: e.target.value as AIModelId })
              }
              className="max-w-[340px]"
              data-testid="ai-model-select"
            >
              <optgroup label="OpenAI · via AI Gateway">
                <option value="openai/gpt-5">GPT-5 (most capable)</option>
                <option value="openai/gpt-5-mini">
                  GPT-5 Mini (recommended · fastest)
                </option>
                <option value="openai/gpt-5-nano">GPT-5 Nano (cheapest)</option>
              </optgroup>
              <optgroup label="Anthropic · via AI Gateway">
                <option value="anthropic/claude-opus-4-7">
                  Claude Opus 4.7 (deepest reasoning)
                </option>
                <option value="anthropic/claude-sonnet-4-6">
                  Claude Sonnet 4.6 (balanced)
                </option>
                <option value="anthropic/claude-haiku-4-5">
                  Claude Haiku 4.5 (fastest Anthropic)
                </option>
              </optgroup>
            </SelectField>
          }
        />
        <FieldRow
          name="Context Memory"
          hint="How much business data the AI sees automatically"
          control={
            <SelectField
              value={settings.contextScope}
              onChange={(e) =>
                persist({
                  contextScope: e.target
                    .value as AISettingsShape["contextScope"],
                })
              }
              className="max-w-[420px]"
              data-testid="ai-context-select"
            >
              <option value="full">
                Full (V/TO + Rocks + Issues + Scorecard + Tasks + Notes + People)
              </option>
              <option value="operational">
                Operational only (Rocks + Issues + Tasks)
              </option>
              <option value="minimal">Minimal (current page only)</option>
            </SelectField>
          }
        />
        <FieldRow
          name="Voice & Tone"
          hint="How the AI communicates · matches your culture"
          control={
            <SelectField
              value={settings.voiceTone}
              onChange={(e) =>
                persist({
                  voiceTone: e.target.value as AISettingsShape["voiceTone"],
                })
              }
              className="max-w-[300px]"
              data-testid="ai-voice-select"
            >
              <option value="direct">Direct · action-oriented (default)</option>
              <option value="coaching">Coaching · question-led</option>
              <option value="concise">Concise · minimal</option>
              <option value="custom">Custom prompt…</option>
            </SelectField>
          }
        />
      </SCard>

      <SCard title="PROACTIVE BRIEFINGS">
        <FieldRow
          name="Today's Focus"
          hint="8:00 AM daily · 3 priorities + recent context"
          control={
            <OrageToggle
              on={briefings.todaysFocus}
              onChange={() => toggleBriefing("todaysFocus")}
              label="Today's Focus"
            />
          }
        />
        <FieldRow
          name="Pre-L10 Brief"
          hint="30 min before L10 · top 3 IDS items + suggested resolutions"
          control={
            <OrageToggle
              on={briefings.preL10}
              onChange={() => toggleBriefing("preL10")}
              label="Pre-L10 Brief"
            />
          }
        />
        <FieldRow
          name="Friday Digest"
          hint="5:00 PM Friday · what shipped, what stalled, what to think about over the weekend"
          control={
            <OrageToggle
              on={briefings.fridayDigest}
              onChange={() => toggleBriefing("fridayDigest")}
              label="Friday Digest"
            />
          }
        />
        <FieldRow
          name="Quarterly Review"
          hint="Last Sunday of quarter · rocks completion + V/TO drift analysis"
          control={
            <OrageToggle
              on={briefings.quarterlyReview}
              onChange={() => toggleBriefing("quarterlyReview")}
              label="Quarterly Review"
            />
          }
        />
      </SCard>

      <div className="text-right mt-2">
        <Link
          href="/ai"
          className="font-display text-[11px] tracking-[0.18em] text-gold-400 hover:text-gold-300 transition-colors"
        >
          FULL CAPABILITIES CONFIG · /AI →
        </Link>
      </div>
    </SectionBlock>
  )
}
