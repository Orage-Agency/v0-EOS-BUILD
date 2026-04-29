"use client"

import { TenantLink as Link } from "@/components/tenant-link"
import { useSettingsStore } from "@/lib/settings-store"
import { OrageToggle } from "@/components/orage/toggle"
import { SectionBlock, SCard, FieldRow, SelectField } from "./ui"

export function AISettings() {
  const ai = useSettingsStore((s) => s.ai)
  const updateAI = useSettingsStore((s) => s.updateAI)
  const toggleBriefing = useSettingsStore((s) => s.toggleBriefing)

  return (
    <SectionBlock
      title="AI IMPLEMENTER"
      description="Configure capabilities, briefings, and how the AI participates in your business · Founder only"
    >
      <SCard title="MODEL & CONTEXT">
        <FieldRow
          name="Default Model"
          hint="Used for all AI Implementer interactions"
          control={
            <SelectField
              value={ai.model}
              onChange={(e) =>
                updateAI({
                  model: e.target.value as typeof ai.model,
                })
              }
              className="max-w-[300px]"
            >
              <option value="claude-opus-4.7">
                Claude Opus 4.7 (recommended)
              </option>
              <option value="claude-sonnet-4.6">Claude Sonnet 4.6</option>
              <option value="claude-haiku-4.5">
                Claude Haiku 4.5 (faster, cheaper)
              </option>
            </SelectField>
          }
        />
        <FieldRow
          name="Context Memory"
          hint="How much business data the AI sees automatically"
          control={
            <SelectField
              value={ai.contextScope}
              onChange={(e) =>
                updateAI({
                  contextScope: e.target.value as typeof ai.contextScope,
                })
              }
              className="max-w-[420px]"
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
              value={ai.voiceTone}
              onChange={(e) =>
                updateAI({
                  voiceTone: e.target.value as typeof ai.voiceTone,
                })
              }
              className="max-w-[300px]"
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
              on={ai.briefings.todaysFocus}
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
              on={ai.briefings.preL10}
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
              on={ai.briefings.fridayDigest}
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
              on={ai.briefings.quarterlyReview}
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
