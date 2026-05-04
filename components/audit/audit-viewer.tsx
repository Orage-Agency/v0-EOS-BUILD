"use client"

import { useMemo, useState } from "react"
import type { AuditRow } from "@/lib/audit-server"

const ENTITY_LABEL: Record<string, string> = {
  rock: "Rock",
  rock_milestone: "Milestone",
  task: "Task",
  task_handoff: "Handoff",
  issue: "Issue",
  scorecard_metric: "Metric",
  scorecard_entry: "Metric value",
  note: "Note",
  meeting: "Meeting",
  vto_document: "V/TO",
  membership: "Member",
  user: "User",
  tenant: "Workspace",
}

const ACTION_TONE: Record<string, string> = {
  create: "text-success",
  update: "text-text-secondary",
  delete: "text-danger",
  complete: "text-gold-400",
  reopen: "text-info",
  handoff: "text-info",
  archive: "text-text-muted",
  publish: "text-success",
  connect: "text-success",
  disconnect: "text-warning",
}

function fmtRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ""
  const diffSec = Math.round((Date.now() - ts) / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 14) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString()
}

function describe(r: AuditRow): string {
  const ent = ENTITY_LABEL[r.entityType] ?? r.entityType
  const meta = r.metadata ?? {}
  const field = (meta.field as string | undefined) ?? null
  const value = meta.value
  const title = (meta.title as string | undefined) ?? null

  switch (r.action) {
    case "create":
      return `created ${ent}${title ? ` "${title}"` : ""}`
    case "delete":
      return `deleted ${ent}`
    case "complete":
      return `marked ${ent} done`
    case "reopen":
      return `reopened ${ent}`
    case "handoff":
      return `handed off ${ent}`
    case "archive":
      return `archived ${ent}`
    case "update":
      if (field) {
        const v =
          value === null || value === undefined
            ? "(cleared)"
            : typeof value === "string"
              ? `"${value.slice(0, 80)}"`
              : String(value)
        return `updated ${ent} ${field} → ${v}`
      }
      return `updated ${ent}`
    default:
      return `${r.action} ${ent}`
  }
}

function toCsv(rows: AuditRow[]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return ""
    const s = typeof v === "string" ? v : JSON.stringify(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const header = [
    "timestamp",
    "actor_name",
    "actor_email",
    "action",
    "entity_type",
    "entity_id",
    "metadata",
  ].join(",")
  const body = rows
    .map((r) =>
      [
        r.createdAt,
        r.actor.name,
        r.actor.email ?? "",
        r.action,
        r.entityType,
        r.entityId,
        r.metadata ? JSON.stringify(r.metadata) : "",
      ]
        .map(escape)
        .join(","),
    )
    .join("\n")
  return `${header}\n${body}`
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

export function AuditViewer({
  rows,
  canSeeAll,
}: {
  rows: AuditRow[]
  canSeeAll: boolean
}) {
  const [filterEntity, setFilterEntity] = useState<string>("")
  const [filterActor, setFilterActor] = useState<string>("")
  const [filterAction, setFilterAction] = useState<string>("")
  const [filterDate, setFilterDate] = useState<"" | "1d" | "7d" | "30d">("")
  const [filterSearch, setFilterSearch] = useState<string>("")

  const filtered = useMemo(() => {
    const cutoffMs =
      filterDate === "1d"
        ? Date.now() - 24 * 60 * 60 * 1000
        : filterDate === "7d"
          ? Date.now() - 7 * 24 * 60 * 60 * 1000
          : filterDate === "30d"
            ? Date.now() - 30 * 24 * 60 * 60 * 1000
            : 0
    const q = filterSearch.trim().toLowerCase()
    return rows.filter((r) => {
      if (filterEntity && r.entityType !== filterEntity) return false
      if (filterActor && r.actor.id !== filterActor) return false
      if (filterAction && r.action !== filterAction) return false
      if (cutoffMs && new Date(r.createdAt).getTime() < cutoffMs) return false
      if (q) {
        const hay =
          `${r.actor.name} ${r.action} ${r.entityType} ${r.entityId} ${
            r.metadata ? JSON.stringify(r.metadata) : ""
          }`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, filterEntity, filterActor, filterAction, filterDate, filterSearch])

  const entities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entityType))).sort(),
    [rows],
  )
  const actions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.action))).sort(),
    [rows],
  )
  const actors = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of rows) {
      if (r.actor.id && !seen.has(r.actor.id)) seen.set(r.actor.id, r.actor.name)
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [rows])

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1
          className="text-[32px]"
          style={{ fontFamily: "Bebas Neue", color: "#E4AF7A", letterSpacing: "0.06em" }}
        >
          AUDIT LOG
        </h1>
        <p className="text-[12px] text-[#8a7860]">
          {canSeeAll
            ? "Every create, update, and delete in this workspace — last 200 events."
            : "Your recent activity in this workspace."}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <input
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Search action or metadata…"
          className="bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[12px] text-[#FFD69C] placeholder:text-[#5a4f3e] focus:outline-none focus:border-[#B68039] flex-1 min-w-[200px]"
        />
        <select
          value={filterEntity}
          onChange={(e) => setFilterEntity(e.target.value)}
          className="bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[12px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
        >
          <option value="">All entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>
              {ENTITY_LABEL[e] ?? e}
            </option>
          ))}
        </select>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[12px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value as typeof filterDate)}
          className="bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[12px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
        >
          <option value="">Any time</option>
          <option value="1d">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        {canSeeAll && actors.length > 0 && (
          <select
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="bg-[#0a0a0a] border border-[rgba(182,128,57,0.18)] rounded-[2px] px-3 py-2 text-[12px] text-[#FFD69C] focus:outline-none focus:border-[#B68039]"
          >
            <option value="">All members</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `orage-audit-${new Date().toISOString().slice(0, 10)}.csv`,
              toCsv(filtered),
            )
          }
          className="font-display text-[10px] tracking-[0.18em] uppercase px-3 py-2 rounded-[2px] border border-gold-500/40 text-gold-400 hover:bg-gold-500/10 transition-colors"
        >
          Export CSV
        </button>
        <span className="ml-auto text-[11px] text-[#8a7860] self-center">
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[2px] border border-dashed border-[rgba(182,128,57,0.18)] bg-[#0a0a0a] px-4 py-12 text-center text-[13px] text-[#8a7860]">
          No activity yet. Audit events appear as you and your team make changes.
        </div>
      ) : (
        <div className="rounded-[2px] border border-[rgba(182,128,57,0.18)] bg-[#0a0a0a] divide-y divide-[rgba(182,128,57,0.12)]">
          {filtered.map((r) => {
            const tone = ACTION_TONE[r.action] ?? "text-text-secondary"
            return (
              <div
                key={r.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-[#151515]"
              >
                <div className="w-7 h-7 rounded-full bg-[#262019] flex items-center justify-center text-[#E4AF7A] text-[10px] font-semibold shrink-0">
                  {r.actor.name?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[#FFD69C] truncate">
                    <span className="font-semibold">{r.actor.name}</span>{" "}
                    <span className={tone}>{describe(r)}</span>
                  </div>
                  <div className="text-[10px] text-[#8a7860] font-mono mt-0.5">
                    {r.entityId.slice(0, 8)} · {fmtRelative(r.createdAt)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
