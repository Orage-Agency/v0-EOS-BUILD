"use client"

import { useState } from "react"
import { toast } from "sonner"
import { USERS } from "@/lib/mock-data"
import {
  SectionBlock,
  SCard,
  PrimaryButton,
  SecondaryButton,
} from "./ui"
import { cn } from "@/lib/utils"

type Filter = "all" | "pending" | "suspended"

const ROLE_PILL: Record<string, { label: string; cls: string }> = {
  founder: {
    label: "FOUNDER",
    cls: "bg-gradient-to-br from-gold-500 to-gold-700 text-text-on-gold",
  },
  admin: {
    label: "ADMIN",
    cls: "bg-[rgba(228,175,122,0.2)] text-gold-400",
  },
  leader: {
    label: "LEADER",
    cls: "bg-[rgba(228,175,122,0.15)] text-gold-400",
  },
  member: {
    label: "MEMBER",
    cls: "bg-[rgba(90,143,170,0.15)] text-info",
  },
  viewer: {
    label: "VIEWER",
    cls: "bg-[rgba(138,120,96,0.2)] text-text-muted",
  },
  field: {
    label: "FIELD",
    cls: "bg-[rgba(138,120,96,0.2)] text-text-muted",
  },
}

const LAST_ACTIVE: Record<string, { label: string; online: boolean }> = {
  u_geo: { label: "NOW", online: true },
  u_bro: { label: "12 MIN AGO", online: true },
  u_bar: { label: "2 H AGO", online: true },
  u_ivy: { label: "YESTERDAY", online: false },
}

const JOINED: Record<string, string> = {
  u_geo: "JAN 14, 2026",
  u_bro: "JAN 14, 2026",
  u_bar: "JAN 14, 2026",
  u_ivy: "FEB 03, 2026",
}

export function MembersSettings() {
  const [filter, setFilter] = useState<Filter>("all")

  return (
    <SectionBlock
      title={`MEMBERS · ${USERS.length}`}
      description="Team members, roles, and permissions · only Founder + Admin can invite or change roles"
    >
      <div className="flex justify-between items-center mb-3.5">
        <div className="flex gap-1.5">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label={`All · ${USERS.length}`}
          />
          <FilterChip
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
            label="Pending · 0"
          />
          <FilterChip
            active={filter === "suspended"}
            onClick={() => setFilter("suspended")}
            label="Suspended · 0"
          />
        </div>
        <PrimaryButton onClick={() => toast("INVITE MODAL · OPEN")}>
          + Invite Member
        </PrimaryButton>
      </div>

      <SCard bodyClassName="p-0">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["MEMBER", "ROLE", "STATUS", "JOINED", "LAST ACTIVE", ""].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left font-display text-[9px] tracking-[0.18em] text-text-muted uppercase font-normal px-3.5 py-2.5 bg-bg-2 border-b border-border-orage"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {USERS.map((u, idx) => {
              const role = ROLE_PILL[u.role] ?? ROLE_PILL.member
              const last = LAST_ACTIVE[u.id]
              return (
                <tr
                  key={u.id}
                  className={cn(
                    "hover:bg-bg-hover transition-colors",
                    idx < USERS.length - 1 && "border-b border-border-orage",
                  )}
                >
                  <td className="px-3.5 py-3 align-middle">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn("avatar avatar-md", u.color)}
                        aria-hidden
                      >
                        {u.initials}
                      </span>
                      <div>
                        <div className="text-xs text-text-primary font-medium leading-tight">
                          {u.name}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono mt-0.5">
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 align-middle">
                    <span
                      className={cn(
                        "inline-block px-2 py-0.5 font-display text-[9px] tracking-[0.18em] rounded-sm",
                        role.cls,
                      )}
                    >
                      {role.label}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 align-middle text-xs text-text-secondary">
                    <span
                      className={cn(
                        "inline-block w-2 h-2 rounded-full mr-1.5",
                        last?.online ? "bg-success" : "bg-text-muted",
                      )}
                    />
                    {last?.online ? "Active" : "Offline"}
                  </td>
                  <td className="px-3.5 py-3 align-middle font-mono text-[11px] text-text-muted">
                    {JOINED[u.id]}
                  </td>
                  <td className="px-3.5 py-3 align-middle font-mono text-[11px] text-text-muted">
                    {last?.label}
                  </td>
                  <td className="px-3.5 py-3 align-middle text-right">
                    <button
                      type="button"
                      onClick={() => toast(`EDIT · ${u.name.toUpperCase()}`)}
                      className="w-[26px] h-[26px] rounded-sm flex items-center justify-center text-text-muted hover:bg-bg-2 hover:text-gold-400 transition-colors inline-flex"
                      aria-label={`Edit ${u.name}`}
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </SCard>
    </SectionBlock>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <SecondaryButton
      onClick={onClick}
      className={cn(active && "bg-bg-active border-gold-500 text-gold-400")}
    >
      {label}
    </SecondaryButton>
  )
}
