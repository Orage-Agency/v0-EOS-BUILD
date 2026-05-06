"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  createApiKey,
  revokeApiKey,
  rotateApiKey,
  type ApiKeyRow,
} from "@/app/actions/api-keys"
import {
  createWebhook,
  deleteWebhook,
  listDeliveries,
  redeliverWebhookDelivery,
  rotateWebhookSecret,
  sendTestWebhook,
  type DeliveryRow,
  type WebhookRow,
} from "@/app/actions/webhooks"
import { ALL_WEBHOOK_EVENTS } from "@/lib/webhooks-types"
import { cn } from "@/lib/utils"

function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

export function IntegrationsShell({
  workspaceSlug,
  initialKeys,
  initialWebhooks,
}: {
  workspaceSlug: string
  initialKeys: ApiKeyRow[]
  initialWebhooks: WebhookRow[]
}) {
  const [keys, setKeys] = useState(initialKeys)
  const [hooks, setHooks] = useState(initialWebhooks)
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [showHookForm, setShowHookForm] = useState(false)
  const [revealedKey, setRevealedKey] = useState<{
    full: string
    name: string
  } | null>(null)
  const [revealedSecret, setRevealedSecret] = useState<{
    secret: string
    name: string
  } | null>(null)

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-8">
      <header>
        <h1 className="font-display text-[26px] md:text-[28px] tracking-[0.06em] text-text-primary uppercase">
          Integrations
        </h1>
        <p className="text-[12px] text-text-muted mt-1.5 leading-relaxed max-w-md">
          API keys, webhooks, and the MCP endpoint that lets external tools —
          n8n, Zapier, Claude Desktop — read and write workspace data.
        </p>
      </header>

      {/* ─── API keys ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase text-gold-400">
            API keys
          </h2>
          <button
            type="button"
            onClick={() => setShowKeyForm((v) => !v)}
            className="font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm border border-gold-500/40 text-gold-400 hover:bg-gold-500/10 transition-colors"
          >
            {showKeyForm ? "Cancel" : "+ New key"}
          </button>
        </div>

        {showKeyForm && (
          <KeyCreateForm
            workspaceSlug={workspaceSlug}
            onCreated={(key) => {
              setKeys((k) => [
                {
                  id: key.id,
                  name: key.name,
                  prefix: key.prefix,
                  scopes: ["read", "write"],
                  createdAt: new Date().toISOString(),
                  lastUsedAt: null,
                  revokedAt: null,
                },
                ...k,
              ])
              setRevealedKey({ full: key.full, name: key.name })
              setShowKeyForm(false)
            }}
          />
        )}

        {revealedKey && (
          <div className="rounded-sm border border-warning/40 bg-warning/5 px-4 py-3">
            <div className="font-display text-[10px] tracking-[0.18em] uppercase text-warning mb-1.5">
              Copy this now — you won't see it again
            </div>
            <div className="text-[11px] text-text-muted mb-2">
              Key for <span className="text-text-primary">{revealedKey.name}</span>
            </div>
            <code className="block font-mono text-[11px] text-text-primary bg-bg-2 border border-border-orage px-2 py-2 rounded-sm break-all select-all">
              {revealedKey.full}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(revealedKey.full)
                toast.success("Copied to clipboard")
              }}
              className="mt-2 font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors mr-2"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setRevealedKey(null)}
              className="font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {keys.length === 0 ? (
          <p className="text-[11px] text-text-muted">
            No keys yet. Create one to authenticate against /api/v1 and /api/mcp.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-bg-3 border border-border-orage rounded-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-text-primary truncate">
                    {k.name}
                  </div>
                  <div className="text-[10px] text-text-muted font-mono mt-0.5 truncate">
                    oc_{k.prefix}_••••••••••• · last used {timeAgo(k.lastUsedAt)}
                    {k.revokedAt && " · revoked"}
                  </div>
                </div>
                {!k.revokedAt && (
                  <>
                    <button
                      type="button"
                      data-testid={`api-key-rotate-${k.id}`}
                      onClick={async () => {
                        if (
                          !confirm(
                            `Rotate "${k.name}"? The current secret stops working immediately and you'll get a new one to copy. Use this when a key may have leaked.`,
                          )
                        )
                          return
                        const res = await rotateApiKey(workspaceSlug, k.id)
                        if (res.ok) {
                          setKeys((rows) =>
                            rows.map((r) =>
                              r.id === k.id
                                ? { ...r, prefix: res.prefix, lastUsedAt: null }
                                : r,
                            ),
                          )
                          setRevealedKey({ full: res.full, name: k.name })
                          toast.success("Key rotated — copy the new secret")
                        } else {
                          toast.error(res.error ?? "Rotate failed")
                        }
                      }}
                      className="font-display text-[10px] tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors"
                    >
                      Rotate
                    </button>
                    <button
                      type="button"
                      data-testid={`api-key-revoke-${k.id}`}
                      onClick={async () => {
                        if (!confirm(`Revoke "${k.name}"? Any caller using it will start failing.`))
                          return
                        const res = await revokeApiKey(workspaceSlug, k.id)
                        if (res.ok) {
                          setKeys((rows) =>
                            rows.map((r) =>
                              r.id === k.id
                                ? { ...r, revokedAt: new Date().toISOString() }
                                : r,
                            ),
                          )
                          toast.success("Key revoked")
                        } else {
                          toast.error(res.error ?? "Revoke failed")
                        }
                      }}
                      className="font-display text-[10px] tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-sm border border-border-orage hover:border-danger/40 hover:text-danger transition-colors"
                    >
                      Revoke
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ─── Webhooks ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[14px] tracking-[0.18em] uppercase text-gold-400">
            Webhooks
          </h2>
          <button
            type="button"
            onClick={() => setShowHookForm((v) => !v)}
            className="font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm border border-gold-500/40 text-gold-400 hover:bg-gold-500/10 transition-colors"
          >
            {showHookForm ? "Cancel" : "+ New webhook"}
          </button>
        </div>

        {showHookForm && (
          <WebhookCreateForm
            workspaceSlug={workspaceSlug}
            onCreated={(hook) => {
              setHooks((h) => [hook.row, ...h])
              setRevealedSecret({ secret: hook.secret, name: hook.row.name })
              setShowHookForm(false)
            }}
          />
        )}

        {revealedSecret && (
          <div className="rounded-sm border border-warning/40 bg-warning/5 px-4 py-3">
            <div className="font-display text-[10px] tracking-[0.18em] uppercase text-warning mb-1.5">
              Webhook secret — copy now, won't be shown again
            </div>
            <div className="text-[11px] text-text-muted mb-2">
              For <span className="text-text-primary">{revealedSecret.name}</span> ·
              verify HMAC-SHA-256 of the request body matches X-Orage-Signature.
            </div>
            <code className="block font-mono text-[11px] text-text-primary bg-bg-2 border border-border-orage px-2 py-2 rounded-sm break-all select-all">
              {revealedSecret.secret}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(revealedSecret.secret)
                toast.success("Copied to clipboard")
              }}
              className="mt-2 font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors mr-2"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setRevealedSecret(null)}
              className="font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {hooks.length === 0 ? (
          <p className="text-[11px] text-text-muted">
            No webhooks yet. Add one and we'll POST events to your URL with an
            HMAC-SHA-256 signature.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {hooks.map((h) => (
              <WebhookListItem
                key={h.id}
                webhook={h}
                workspaceSlug={workspaceSlug}
                onDelete={() => setHooks((rows) => rows.filter((r) => r.id !== h.id))}
                onSecretRotated={(secret) =>
                  setRevealedSecret({ secret, name: h.name })
                }
              />
            ))}
          </ul>
        )}
      </section>

      {/* ─── MCP endpoint info ─────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[14px] tracking-[0.18em] uppercase text-gold-400">
          MCP endpoint
        </h2>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Point n8n's MCP Client node, Claude Desktop, or any JSON-RPC 2.0 MCP
          client at:
        </p>
        <code className="block font-mono text-[11px] text-text-primary bg-bg-2 border border-border-orage px-2 py-2 rounded-sm break-all select-all">
          POST {typeof window !== "undefined" ? window.location.origin : ""}/api/mcp
        </code>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Authenticate with any of the API keys above as a Bearer token. Tools
          exposed: <span className="text-text-secondary">list_tasks, create_task,
          update_task, list_rocks, create_rock, list_issues, create_issue,
          list_people</span>.
        </p>
        <a
          href={`/${workspaceSlug}/docs/api`}
          className="inline-block font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm border border-gold-500/40 text-gold-400 hover:bg-gold-500/10 transition-colors"
        >
          Read the API docs →
        </a>
      </section>
    </div>
  )
}

function WebhookListItem({
  webhook,
  workspaceSlug,
  onDelete,
  onSecretRotated,
}: {
  webhook: WebhookRow
  workspaceSlug: string
  onDelete: () => void
  onSecretRotated: (newSecret: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [deliveries, setDeliveries] = useState<DeliveryRow[] | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadDeliveries() {
    setLoading(true)
    const res = await listDeliveries(workspaceSlug, webhook.id, 25)
    setLoading(false)
    if (res.ok) setDeliveries(res.deliveries)
    else toast.error(res.error)
  }

  return (
    <li className="bg-bg-3 border border-border-orage rounded-sm">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-text-primary truncate">
            {webhook.name}
          </div>
          <div className="text-[10px] text-text-muted font-mono mt-0.5 truncate">
            {webhook.targetUrl} ·{" "}
            {webhook.eventTypes.length === 0
              ? "all events"
              : `${webhook.eventTypes.length} events`}{" "}
            · {webhook.totalDeliveries} sent
            {webhook.failedDeliveries > 0
              ? ` · ${webhook.failedDeliveries} dead`
              : ""}{" "}
            · last delivered {timeAgo(webhook.lastDeliveredAt)}
          </div>
        </div>
        {webhook.consecutiveFailures > 0 && (
          <span
            className={cn(
              "font-display text-[9px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-sm",
              webhook.consecutiveFailures >= 3
                ? "bg-danger/15 text-danger"
                : "bg-warning/15 text-warning",
            )}
          >
            {webhook.consecutiveFailures} fail
            {webhook.consecutiveFailures === 1 ? "" : "s"}
          </span>
        )}
        <button
          type="button"
          onClick={async () => {
            const res = await sendTestWebhook(workspaceSlug, webhook.id)
            if (res.ok) {
              toast.success(`Test sent · HTTP ${res.status}`)
            } else {
              toast.error(res.error ?? "Test failed")
            }
          }}
          className="font-display text-[10px] tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors"
        >
          Test
        </button>
        <button
          type="button"
          onClick={() => {
            const willOpen = !open
            setOpen(willOpen)
            if (willOpen && deliveries === null) void loadDeliveries()
          }}
          className="font-display text-[10px] tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors"
        >
          {open ? "Close" : "Log"}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (
              !confirm(
                `Rotate signing secret for "${webhook.name}"? Existing consumers will need the new secret to verify signatures.`,
              )
            )
              return
            const res = await rotateWebhookSecret(workspaceSlug, webhook.id)
            if (res.ok) {
              onSecretRotated(res.secret)
              toast.success("Secret rotated")
            } else {
              toast.error(res.error ?? "Rotate failed")
            }
          }}
          className="font-display text-[10px] tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors"
        >
          Rotate
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirm(`Delete "${webhook.name}"?`)) return
            const res = await deleteWebhook(workspaceSlug, webhook.id)
            if (res.ok) {
              onDelete()
              toast.success("Webhook deleted")
            } else {
              toast.error(res.error ?? "Delete failed")
            }
          }}
          className="font-display text-[10px] tracking-[0.18em] uppercase px-2.5 py-1.5 rounded-sm border border-border-orage hover:border-danger/40 hover:text-danger transition-colors"
        >
          Delete
        </button>
      </div>
      {open && (
        <div className="border-t border-border-orage px-3 py-3 bg-bg-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-[10px] tracking-[0.18em] uppercase text-text-muted">
              Recent deliveries (last 25)
            </span>
            <button
              type="button"
              onClick={() => void loadDeliveries()}
              disabled={loading}
              className="font-display text-[10px] tracking-[0.18em] uppercase px-2 py-1 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {deliveries === null ? (
            <p className="text-[11px] text-text-muted">Loading…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-[11px] text-text-muted">No deliveries yet.</p>
          ) : (
            <ul className="space-y-1">
              {deliveries.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm bg-bg-3 border border-border-orage"
                >
                  <span
                    className={cn(
                      "font-display text-[9px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-sm shrink-0",
                      d.deliveredAt
                        ? "bg-success/15 text-success"
                        : d.attempts >= 5
                          ? "bg-danger/15 text-danger"
                          : "bg-warning/15 text-warning",
                    )}
                  >
                    {d.deliveredAt
                      ? d.lastStatus ?? 200
                      : d.attempts >= 5
                        ? "dead"
                        : `try ${d.attempts}`}
                  </span>
                  <span className="font-mono text-[10px] text-text-secondary truncate flex-1">
                    {d.eventType}
                  </span>
                  <span className="font-mono text-[10px] text-text-muted shrink-0">
                    {timeAgo(d.lastAttemptAt ?? d.createdAt)}
                  </span>
                  {d.lastError && (
                    <span
                      className="font-mono text-[10px] text-danger truncate max-w-[160px]"
                      title={d.lastError}
                    >
                      {d.lastError}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await redeliverWebhookDelivery(
                        workspaceSlug,
                        d.id,
                      )
                      if (res.ok) {
                        toast.success("Re-queued — fires within 1 minute")
                        void loadDeliveries()
                      } else {
                        toast.error(res.error ?? "Redeliver failed")
                      }
                    }}
                    className="font-display text-[9px] tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-sm border border-border-orage hover:border-gold-500/60 hover:text-gold-400 transition-colors shrink-0"
                  >
                    Retry
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

function KeyCreateForm({
  workspaceSlug,
  onCreated,
}: {
  workspaceSlug: string
  onCreated: (key: { id: string; full: string; prefix: string; name: string }) => void
}) {
  const [name, setName] = useState("")
  const [pending, setPending] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (pending) return
        setPending(true)
        const res = await createApiKey(workspaceSlug, name)
        setPending(false)
        if (res.ok) {
          onCreated({ id: res.id, full: res.full, prefix: res.prefix, name })
          setName("")
        } else {
          toast.error(res.error ?? "Create failed")
        }
      }}
      className="rounded-sm border border-border-orage bg-bg-3 px-3 py-3 space-y-2"
    >
      <label className="block">
        <span className="block font-display text-[10px] tracking-[0.18em] uppercase text-text-muted mb-1">
          Name
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. n8n production"
          className="w-full px-3 py-2 bg-bg-2 border border-border-orage rounded-sm text-[13px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-gold-500"
          required
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm transition-colors",
          pending
            ? "bg-gold-500/40 text-bg-1/60 cursor-not-allowed"
            : "bg-gold-500 hover:bg-gold-400 text-text-on-gold",
        )}
      >
        {pending ? "Creating…" : "Create key"}
      </button>
    </form>
  )
}

function WebhookCreateForm({
  workspaceSlug,
  onCreated,
}: {
  workspaceSlug: string
  onCreated: (h: { row: WebhookRow; secret: string }) => void
}) {
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [events, setEvents] = useState<string[]>([])
  const [pending, setPending] = useState(false)
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (pending) return
        setPending(true)
        const res = await createWebhook(workspaceSlug, {
          name,
          targetUrl: url,
          eventTypes: events,
        })
        setPending(false)
        if (res.ok) {
          onCreated({
            row: {
              id: res.id,
              name,
              targetUrl: url,
              eventTypes: events,
              active: true,
              createdAt: new Date().toISOString(),
              lastDeliveredAt: null,
              lastDeliveryStatus: null,
              consecutiveFailures: 0,
              totalDeliveries: 0,
              failedDeliveries: 0,
            },
            secret: res.secret,
          })
          setName("")
          setUrl("")
          setEvents([])
        } else {
          toast.error(res.error ?? "Create failed")
        }
      }}
      className="rounded-sm border border-border-orage bg-bg-3 px-3 py-3 space-y-3"
    >
      <label className="block">
        <span className="block font-display text-[10px] tracking-[0.18em] uppercase text-text-muted mb-1">
          Name
        </span>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. n8n task sync"
          className="w-full px-3 py-2 bg-bg-2 border border-border-orage rounded-sm text-[13px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-gold-500"
          required
        />
      </label>
      <label className="block">
        <span className="block font-display text-[10px] tracking-[0.18em] uppercase text-text-muted mb-1">
          Target URL (HTTPS)
        </span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-n8n.example.com/webhook/orage"
          type="url"
          className="w-full px-3 py-2 bg-bg-2 border border-border-orage rounded-sm text-[13px] text-text-primary placeholder:text-text-dim focus:outline-none focus:border-gold-500"
          required
        />
      </label>
      <fieldset>
        <legend className="block font-display text-[10px] tracking-[0.18em] uppercase text-text-muted mb-1">
          Events ({events.length === 0 ? "all" : events.length})
        </legend>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_WEBHOOK_EVENTS.map((ev) => {
            const checked = events.includes(ev)
            return (
              <label
                key={ev}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-sm border text-[11px] font-mono cursor-pointer transition-colors",
                  checked
                    ? "border-gold-500/60 bg-gold-500/10 text-gold-400"
                    : "border-border-orage text-text-secondary hover:border-gold-500/40",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) setEvents([...events, ev])
                    else setEvents(events.filter((x) => x !== ev))
                  }}
                  className="hidden"
                />
                {ev}
              </label>
            )
          })}
        </div>
        <p className="text-[10px] text-text-muted mt-1.5">
          Leave all unchecked to subscribe to every event.
        </p>
      </fieldset>
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "font-display text-[10px] tracking-[0.18em] uppercase px-3 py-1.5 rounded-sm transition-colors",
          pending
            ? "bg-gold-500/40 text-bg-1/60 cursor-not-allowed"
            : "bg-gold-500 hover:bg-gold-400 text-text-on-gold",
        )}
      >
        {pending ? "Creating…" : "Create webhook"}
      </button>
    </form>
  )
}
