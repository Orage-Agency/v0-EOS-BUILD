/**
 * Public status page. Server-component-renders the latest health probe
 * so external visitors (and the user's own monitoring) can read system
 * health without authenticating.
 *
 * Strategy: fetch /api/health on each render with no caching. Cheap
 * because the underlying checks have a 3s budget total. We could later
 * wire this into BetterStack / OneSignal / a hosted status page, but
 * having a self-served `/status` URL closes the "do you have a status
 * page?" enterprise-checklist item today.
 */
export const dynamic = "force-dynamic"
export const revalidate = 0
export const metadata = { title: "Status · Orage Core" }

type CheckResult = {
  ok: boolean
  latency_ms: number
  error?: string
}

type HealthBody = {
  ok: boolean
  checks: { db: CheckResult; ai: CheckResult }
  version: string
  region: string
  generated_at: string
}

async function fetchHealth(origin: string): Promise<HealthBody | null> {
  try {
    const res = await fetch(`${origin}/api/health`, { cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as HealthBody
  } catch {
    return null
  }
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] font-mono " +
        (ok
          ? "bg-[rgba(111,170,107,0.15)] text-[#6FAA6B]"
          : "bg-[rgba(194,84,80,0.15)] text-[#C25450]")
      }
    >
      <span
        className={
          "inline-block w-1.5 h-1.5 rounded-full " +
          (ok ? "bg-[#6FAA6B]" : "bg-[#C25450]")
        }
      />
      {ok ? "OPERATIONAL" : "DEGRADED"}
    </span>
  )
}

export default async function StatusPage() {
  // Server fetches its own /api/health using the deployment's public URL
  // so the report mirrors what an external visitor sees.
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  const health = await fetchHealth(origin)
  const overallOk = health?.ok ?? false

  return (
    <main className="min-h-screen bg-black text-[#FFD69C] flex items-start justify-center py-16 px-6">
      <div className="w-full max-w-2xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <div
              className="text-[11px] tracking-[0.18em] text-[#8a7860] mb-2"
              style={{ fontFamily: "Bebas Neue" }}
            >
              ◆ ORAGE CORE
            </div>
            <h1
              className="text-[34px] tracking-[0.06em]"
              style={{ fontFamily: "Bebas Neue", color: "#E4AF7A" }}
            >
              SYSTEM STATUS
            </h1>
          </div>
          <StatusBadge ok={overallOk} />
        </header>

        {!health ? (
          <div className="rounded-sm border border-[rgba(194,84,80,0.4)] bg-[rgba(194,84,80,0.05)] p-4 text-[13px]">
            Health probe didn't respond. The app itself may be online but
            something between this page and{" "}
            <code className="font-mono">/api/health</code> is failing.
          </div>
        ) : (
          <ul className="space-y-2">
            <Component
              name="Web tier"
              ok={true}
              detail={`region ${health.region}`}
            />
            <Component
              name="Database"
              ok={health.checks.db.ok}
              detail={
                health.checks.db.error
                  ? health.checks.db.error
                  : `${health.checks.db.latency_ms}ms`
              }
            />
            <Component
              name="AI Gateway"
              ok={health.checks.ai.ok}
              detail={
                health.checks.ai.error
                  ? health.checks.ai.error
                  : `${health.checks.ai.latency_ms}ms`
              }
            />
          </ul>
        )}

        <footer className="mt-10 text-[11px] text-[#5a4f3e] font-mono leading-relaxed">
          {health ? (
            <>
              Last checked {new Date(health.generated_at).toLocaleString()} ·
              build{" "}
              <code className="text-[#8a7860]">
                {health.version.slice(0, 7)}
              </code>
            </>
          ) : (
            <>Health endpoint unreachable.</>
          )}
          <div className="mt-2">
            For incident updates and maintenance windows email{" "}
            <a
              href="mailto:status@orage.agency"
              className="text-[#E4AF7A] hover:underline"
            >
              status@orage.agency
            </a>
            .
          </div>
        </footer>
      </div>
    </main>
  )
}

function Component({
  name,
  ok,
  detail,
}: {
  name: string
  ok: boolean
  detail: string
}) {
  return (
    <li className="flex items-center justify-between px-4 py-3 rounded-sm border border-[rgba(182,128,57,0.18)] bg-[#151515]">
      <div className="flex items-center gap-3">
        <span
          className={
            "inline-block w-2 h-2 rounded-full " +
            (ok ? "bg-[#6FAA6B]" : "bg-[#C25450]")
          }
        />
        <span
          className="text-[13px] tracking-[0.04em]"
          style={{ fontFamily: "Bebas Neue" }}
        >
          {name.toUpperCase()}
        </span>
      </div>
      <span className="font-mono text-[11px] text-[#8a7860]">{detail}</span>
    </li>
  )
}
