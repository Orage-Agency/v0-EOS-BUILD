import { TenantLink as Link } from "@/components/tenant-link"
import type { TeamFocusEntry } from "@/lib/dashboard"
import { OrageAvatar } from "@/components/orage/avatar"
import { cn } from "@/lib/utils"

export function TeamFocus({ entries }: { entries: TeamFocusEntry[] }) {
  return (
    <section className="solid mb-5 overflow-hidden">
      <header className="px-[18px] py-3.5 border-b border-border-orage flex items-center justify-between">
        <div className="font-display text-[13px] tracking-[0.22em] text-gold-400 uppercase">
          TEAM FOCUS
        </div>
        <Link
          href="/people"
          className="text-[11px] text-text-muted hover:text-gold-400 transition-colors"
        >
          People →
        </Link>
      </header>
      {entries.length === 0 ? (
        <div className="px-[18px] py-8 text-center text-xs">
          <p className="text-text-secondary mb-1">Nobody on the wire yet.</p>
          <p className="text-text-muted leading-relaxed max-w-[260px] mx-auto">
            Invite teammates from the People page — what each one is working on
            will appear here.
          </p>
        </div>
      ) : (
        <ul>
          {entries.map((e) => {
            const initials = e.initials || "??"
            return (
              <li
                key={e.userId}
                className="grid items-center gap-3 px-[18px] py-3 border-b border-border-orage last:border-b-0"
                style={{ gridTemplateColumns: "32px 1fr auto" }}
              >
                <OrageAvatar
                  user={{
                    name: e.name,
                    initials,
                    color: e.color ?? undefined,
                  }}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="text-[12px] text-text-primary font-medium truncate uppercase">
                    {e.name}
                  </div>
                  {e.current ? (
                    <div className="text-[11px] text-text-muted truncate flex items-center gap-1.5 mt-0.5">
                      <span className="font-display text-[9px] tracking-[0.15em] text-gold-500 shrink-0">
                        NOW
                      </span>
                      <span className="truncate uppercase">{e.current.title}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-text-dim mt-0.5 italic">
                      No open tasks
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-mono text-text-primary">
                    {e.openTasks}
                  </div>
                  <div
                    className={cn(
                      "text-[9px] font-display tracking-[0.18em] uppercase",
                      e.openTasks === 0 ? "text-text-dim" : "text-text-muted",
                    )}
                  >
                    Open
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
