"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { OrageAvatar } from "@/components/orage/avatar"
import { CURRENT_USER, USERS } from "@/lib/mock-data"
import { useScorecardStore, type MetricSource } from "@/lib/scorecard-store"
import { createMetric } from "@/app/actions/scorecard"
import { useWorkspaceSlug } from "@/hooks/use-workspace-slug"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const GROUPS = [
  "Sales & Growth",
  "Client Experience",
  "Product & Execution",
  "Boomer AI · Partnership",
]

export function NewMetricModal() {
  const { newMetricOpen, closeNewMetric, createMetric: createLocal } = useScorecardStore()
  const workspaceSlug = useWorkspaceSlug()

  const [name, setName] = useState("")
  const [unit, setUnit] = useState("")
  const [target, setTarget] = useState("")
  const [direction, setDirection] = useState<"up" | "down">("up")
  const [ownerId, setOwnerId] = useState(CURRENT_USER.id)
  const [group, setGroup] = useState(GROUPS[0])
  const [source, setSource] = useState<MetricSource>("manual")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!newMetricOpen) return
    setName("")
    setUnit("")
    setTarget("")
    setDirection("up")
    setOwnerId(CURRENT_USER.id)
    setGroup(GROUPS[0])
    setSource("manual")
  }, [newMetricOpen])

  async function submit() {
    if (!name.trim()) {
      toast("NAME REQUIRED")
      return
    }
    const targetNum = Number(target)
    if (!Number.isFinite(targetNum)) {
      toast("VALID TARGET REQUIRED")
      return
    }
    setBusy(true)
    try {
      createLocal({
        name,
        unit,
        target: targetNum,
        direction,
        ownerId,
        group,
        source,
      })
      await createMetric(workspaceSlug, {
        name,
        unit,
        target: targetNum,
        direction,
        ownerId,
        group,
        source,
      })
      toast("METRIC CREATED")
      closeNewMetric()
    } catch (err) {
      toast("FAILED", {
        description:
          err instanceof Error ? err.message : "Could not create metric",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={newMetricOpen} onOpenChange={(o) => !o && closeNewMetric()}>
      <DialogContent className="max-w-[560px] glass-strong border-gold-500 p-0 gap-0 overflow-hidden bg-bg-2">
        <DialogHeader className="px-6 pt-5 pb-3.5 border-b border-border-orage">
          <DialogTitle className="font-display text-[22px] tracking-[0.1em] text-gold-400">
            NEW METRIC
          </DialogTitle>
          <DialogDescription className="text-[12px] text-text-muted">
            Track weekly. Two consecutive reds auto-creates an issue.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 flex flex-col gap-3.5 max-h-[70vh] overflow-y-auto">
          <Field label="Metric Name" required>
            <Input value={name} onChange={setName} placeholder="e.g. Discovery Calls Booked" />
          </Field>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Target" required>
              <Input
                value={target}
                onChange={setTarget}
                placeholder="8"
                type="number"
              />
            </Field>
            <Field label="Unit (optional)">
              <Input value={unit} onChange={setUnit} placeholder="/week" />
            </Field>
          </div>

          <Field label="Direction">
            <div className="grid grid-cols-2 gap-2">
              <DirToggle
                active={direction === "up"}
                onClick={() => setDirection("up")}
                title="Higher Better"
                desc="≥ target = green"
              />
              <DirToggle
                active={direction === "down"}
                onClick={() => setDirection("down")}
                title="Lower Better"
                desc="≤ target = green"
              />
            </div>
          </Field>

          <Field label="Owner">
            <div className="flex flex-wrap gap-1.5">
              {USERS.map((u) => {
                const active = u.id === ownerId
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setOwnerId(u.id)}
                    className={cn(
                      "px-2 py-1.5 rounded-sm border flex items-center gap-1.5 text-[11px] transition-colors",
                      active
                        ? "bg-bg-4 border-gold-500 text-gold-400"
                        : "bg-bg-3 border-border-orage text-text-secondary hover:border-gold-500",
                    )}
                    aria-pressed={active}
                  >
                    <OrageAvatar user={u} size="xs" />
                    {u.initials}
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Group">
              <Select value={group} onChange={setGroup}>
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Source">
              <Select
                value={source}
                onChange={(v) => setSource(v as MetricSource)}
              >
                <option value="manual">Manual</option>
                <option value="stripe">Stripe</option>
                <option value="ghl">GHL</option>
                <option value="n8n">n8n</option>
                <option value="ai">AI Computed</option>
              </Select>
            </Field>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border-orage flex-row justify-end sm:justify-end gap-2">
          <Button variant="outline" onClick={closeNewMetric} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-gradient-to-br from-gold-500 to-gold-400 text-text-on-gold hover:opacity-90"
          >
            {busy ? "Creating…" : "Create Metric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-[10px] tracking-[0.2em] text-gold-500 uppercase">
        {label}
        {required ? <span className="text-danger ml-0.5">*</span> : null}
      </span>
      {children}
    </label>
  )
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-dim outline-none focus-visible:border-gold-500 transition-colors"
    />
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-bg-3 border border-border-orage rounded-sm px-3 py-2.5 text-[13px] text-text-primary outline-none focus-visible:border-gold-500 transition-colors"
    >
      {children}
    </select>
  )
}

function DirToggle({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3 py-3 rounded-sm border text-left transition-all",
        active
          ? "bg-bg-4 border-gold-500"
          : "bg-bg-3 border-border-orage hover:border-gold-500",
      )}
    >
      <div className="font-display text-[11px] tracking-[0.18em] text-gold-400 mb-0.5">
        {title}
      </div>
      <div className="text-[10px] text-text-muted">{desc}</div>
    </button>
  )
}
