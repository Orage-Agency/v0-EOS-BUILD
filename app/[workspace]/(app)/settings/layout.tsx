import type { ReactNode } from "react"
import { SettingsNav } from "@/components/settings/settings-nav"

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="px-8 pt-6 pb-16 max-w-[1280px] mx-auto">
      <header className="mb-6">
        <h1 className="font-display text-[36px] tracking-[0.08em] text-gold-400 leading-none">
          SETTINGS
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Workspace · members · integrations · security · all in one place
        </p>
      </header>

      <div className="grid gap-0 items-start" style={{ gridTemplateColumns: "240px 1fr" }}>
        <SettingsNav />
        <main className="pl-6 min-w-0">{children}</main>
      </div>
    </div>
  )
}
