"use client"

import { toast } from "sonner"
import {
  INTEGRATIONS,
  useSettingsStore,
  type Integration,
  type IntegrationKey,
} from "@/lib/settings-store"
import { SectionBlock } from "./ui"
import { cn } from "@/lib/utils"

const META_BY_KEY: Partial<Record<IntegrationKey, string>> = {
  slack: "ORAGE WORKSPACE",
  gcal: "4 USERS",
  n8n: "12 WORKFLOWS",
}

export function IntegrationsList() {
  const connected = useSettingsStore((s) => s.integrations.connected)
  const errored = useSettingsStore((s) => s.integrations.errored)
  const connect = useSettingsStore((s) => s.connectIntegration)
  const disconnect = useSettingsStore((s) => s.disconnectIntegration)
  const openConfigure = useSettingsStore((s) => s.openConfigure)

  return (
    <SectionBlock
      title="INTEGRATIONS"
      description="Connect Orage Core to the tools your team already uses · OAuth + webhook based"
    >
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {INTEGRATIONS.map((it) => {
          const isConnected = connected.has(it.key)
          const isErrored = errored.has(it.key)
          return (
            <IntegrationCard
              key={it.key}
              integration={it}
              isConnected={isConnected}
              isErrored={isErrored}
              onConnect={() => {
                connect(it.key)
                toast(`${it.name.toUpperCase()} · LAUNCHING OAUTH FLOW`)
              }}
              onConfigure={() => {
                openConfigure(it.key)
                toast(`CONFIGURE · ${it.name.toUpperCase()}`)
              }}
              onDisconnect={() => {
                disconnect(it.key)
                toast(`${it.name.toUpperCase()} · DISCONNECTED`)
              }}
            />
          )
        })}
      </div>
    </SectionBlock>
  )
}

function IntegrationCard({
  integration,
  isConnected,
  isErrored,
  onConnect,
  onConfigure,
  onDisconnect,
}: {
  integration: Integration
  isConnected: boolean
  isErrored: boolean
  onConnect: () => void
  onConfigure: () => void
  onDisconnect: () => void
}) {
  const meta = META_BY_KEY[integration.key]
  return (
    <div
      className={cn(
        "bg-bg-3 border border-border-orage rounded-sm p-3.5 transition-colors hover:border-gold-500 relative overflow-hidden",
        isConnected && !isErrored && "border-l-[3px] border-l-success",
        isErrored && "border-l-[3px] border-l-danger",
      )}
    >
      <header className="flex items-center gap-2.5 mb-2">
        <div
          className={cn(
            "w-[34px] h-[34px] rounded-sm flex items-center justify-center font-bold text-sm text-white shrink-0",
            integration.invertedBorder && "border border-border-orage",
          )}
          style={{
            background: `linear-gradient(135deg, ${integration.logoFrom}, ${integration.logoTo})`,
          }}
          aria-hidden
        >
          {integration.logoChar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-sm tracking-[0.05em] text-gold-400 leading-none mb-0.5">
            {integration.name.toUpperCase()}
          </div>
          <div
            className={cn(
              "text-[10px] font-mono",
              isErrored
                ? "text-danger"
                : isConnected
                  ? "text-success"
                  : "text-text-muted",
            )}
          >
            {isErrored
              ? "● ERROR · RECONNECT"
              : isConnected
                ? `● CONNECTED${meta ? ` · ${meta}` : ""}`
                : "NOT CONNECTED"}
          </div>
        </div>
      </header>
      <p className="text-[11px] text-text-secondary leading-relaxed mb-2.5">
        {integration.description}
      </p>
      <div className="flex gap-1.5">
        {isConnected ? (
          <>
            <button
              type="button"
              onClick={onConfigure}
              className="px-3 py-1.5 font-display text-[9px] tracking-[0.18em] rounded-sm bg-transparent border border-border-orage text-text-secondary hover:border-gold-500 hover:text-gold-400 transition-colors font-semibold"
            >
              CONFIGURE
            </button>
            <button
              type="button"
              onClick={onDisconnect}
              className="px-3 py-1.5 font-display text-[9px] tracking-[0.18em] rounded-sm bg-transparent border border-border-orage text-text-muted hover:border-danger hover:text-danger transition-colors font-semibold"
            >
              DISCONNECT
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onConnect}
            className="px-3 py-1.5 font-display text-[9px] tracking-[0.18em] rounded-sm text-text-on-gold font-semibold transition-all hover:-translate-y-px hover:shadow-[0_2px_8px_rgba(182,128,57,0.3)]"
            style={{
              background: "linear-gradient(135deg, var(--gold-500), var(--gold-400))",
            }}
          >
            {integration.key === "webhook" ? "CONFIGURE" : "CONNECT"}
          </button>
        )}
      </div>
    </div>
  )
}
