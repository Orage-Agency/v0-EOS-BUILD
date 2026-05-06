export const metadata = { title: "API Docs · Orage Core" }

const REST_EXAMPLE = `curl https://orage-core.app/api/v1/tasks \\
  -H "Authorization: Bearer oc_xxx_yyyyyyyyyy"

# Create a task
curl -X POST https://orage-core.app/api/v1/tasks \\
  -H "Authorization: Bearer oc_xxx_yyyyyyyyyy" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Stripe entitlement spec",
    "priority": "high",
    "due_date": "2026-05-15"
  }'`

const WEBHOOK_EXAMPLE = `// n8n / express verifier
import crypto from "crypto"

app.post("/webhook/orage", express.raw({ type: "*/*" }), (req, res) => {
  const signature = req.headers["x-orage-signature"]?.split("=")[1]
  const expected = crypto
    .createHmac("sha256", process.env.ORAGE_WEBHOOK_SECRET)
    .update(req.body)
    .digest("hex")
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(401).end()
  }
  const event = JSON.parse(req.body.toString())
  // event.event === "task.created" | "rock.updated" | …
  // event.data === the resource shape
  res.status(200).end()
})`

const MCP_EXAMPLE = `# n8n MCP Client node
URL:        https://orage-core.app/api/mcp
Transport:  HTTP
Auth:       Bearer oc_xxx_yyyyyyyyyy

# Or in Claude Desktop's mcp.json:
{
  "mcpServers": {
    "orage": {
      "transport": "http",
      "url": "https://orage-core.app/api/mcp",
      "headers": { "Authorization": "Bearer oc_xxx_yyyyyyyyyy" }
    }
  }
}`

export default async function ApiDocsPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-10">
      <header>
        <h1 className="font-display text-[26px] md:text-[28px] tracking-[0.06em] text-text-primary uppercase">
          API & integrations
        </h1>
        <p className="text-[13px] text-text-muted mt-1.5 leading-relaxed">
          Three ways for external tools to read and write your Orage workspace.
          All authenticate with workspace-scoped keys you generate in{" "}
          <a
            href={`/${workspace}/settings/integrations`}
            className="text-gold-400 underline hover:text-gold-300"
          >
            Settings → Integrations
          </a>
          .
        </p>
      </header>

      {/* ─── REST ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[16px] tracking-[0.18em] uppercase text-gold-400">
          REST API
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          CRUD endpoints under <code className="font-mono">/api/v1/&lt;resource&gt;</code>.
          Bearer-token auth. JSON in, JSON out. Soft-deleted rows stay in
          /trash for 30 days.
        </p>
        <div className="rounded-sm border border-border-orage bg-bg-3 overflow-hidden">
          <table className="w-full text-[12px] font-mono">
            <thead>
              <tr className="border-b border-border-orage bg-bg-2">
                <th className="text-left px-3 py-2 text-text-muted font-display tracking-wider uppercase">
                  Method
                </th>
                <th className="text-left px-3 py-2 text-text-muted font-display tracking-wider uppercase">
                  Path
                </th>
                <th className="text-left px-3 py-2 text-text-muted font-display tracking-wider uppercase">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {[
                ["GET",    "/api/v1/tasks",        "List tasks"],
                ["POST",   "/api/v1/tasks",        "Create a task"],
                ["GET",    "/api/v1/tasks/:id",    "Get one"],
                ["PATCH",  "/api/v1/tasks/:id",    "Update"],
                ["DELETE", "/api/v1/tasks/:id",    "Soft-delete"],
                ["GET",    "/api/v1/rocks",        "List rocks"],
                ["POST",   "/api/v1/rocks",        "Create a rock"],
                ["GET",    "/api/v1/rocks/:id",    ""],
                ["PATCH",  "/api/v1/rocks/:id",    ""],
                ["DELETE", "/api/v1/rocks/:id",    ""],
                ["GET",    "/api/v1/issues",       "List issues"],
                ["POST",   "/api/v1/issues",       "Create an issue"],
                ["GET",    "/api/v1/notes",        "List notes"],
                ["POST",   "/api/v1/notes",        "Create a note"],
              ].map(([m, p, d], i) => (
                <tr key={i} className="border-b border-border-orage last:border-b-0">
                  <td className="px-3 py-2 text-gold-400">{m}</td>
                  <td className="px-3 py-2">{p}</td>
                  <td className="px-3 py-2 text-text-muted">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeBlock label="Example" code={REST_EXAMPLE} />
        <p className="text-[11px] text-text-muted leading-relaxed">
          List endpoints accept <code className="font-mono">?limit=50&amp;offset=0</code>{" "}
          (max 200 per page) and return{" "}
          <code className="font-mono">{`{ items, pagination }`}</code>.
          Per-key rate limit: <strong>60/minute, 1000/hour</strong> — the
          response carries{" "}
          <code className="font-mono">X-RateLimit-Remaining-Minute</code>/
          <code className="font-mono">-Hour</code> headers.
        </p>
        <p className="text-[11px] text-text-muted leading-relaxed">
          POST endpoints accept an{" "}
          <code className="font-mono">Idempotency-Key</code> header. Same key
          + same body returns the original response (with{" "}
          <code className="font-mono">Idempotent-Replay: true</code>); same
          key + different body returns <code className="font-mono">422</code>.
          Cached for 24 hours.
        </p>
        <p className="text-[12px] text-text-muted leading-relaxed">
          Machine-readable spec:{" "}
          <a
            href="/api/v1/openapi"
            className="text-gold-400 underline hover:text-gold-300 font-mono"
          >
            GET /api/v1/openapi
          </a>{" "}
          (OpenAPI 3.1) — drop into Postman, Insomnia, or any OpenAPI-aware
          tool.
        </p>
      </section>

      {/* ─── Webhooks ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[16px] tracking-[0.18em] uppercase text-gold-400">
          Webhooks
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Subscribe to <code className="font-mono">task.created</code>,{" "}
          <code className="font-mono">rock.updated</code>, etc. and we'll POST
          a JSON envelope to your URL within ~2 minutes of the change. Each
          delivery is signed with HMAC-SHA-256 in the{" "}
          <code className="font-mono">X-Orage-Signature</code> header.
        </p>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Failed deliveries retry with exponential backoff up to 5 attempts
          across roughly 4 hours. After that the row stops being eligible and
          the webhook's <code className="font-mono">consecutive_failures</code>{" "}
          surfaces in Settings.
        </p>
        <CodeBlock label="Verify signature" code={WEBHOOK_EXAMPLE} />
      </section>

      {/* ─── MCP ──────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[16px] tracking-[0.18em] uppercase text-gold-400">
          MCP server (Model Context Protocol)
        </h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          A streamable HTTP MCP endpoint at{" "}
          <code className="font-mono">/api/mcp</code> exposes your workspace
          as tools that any MCP-compatible client can call. n8n's{" "}
          <em>MCP Client</em> node, Claude Desktop, Cursor — all plug in with
          the same workspace API key you use for REST.
        </p>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Tools available: <code className="font-mono">list_tasks</code>,{" "}
          <code className="font-mono">create_task</code>,{" "}
          <code className="font-mono">update_task</code>,{" "}
          <code className="font-mono">list_rocks</code>,{" "}
          <code className="font-mono">create_rock</code>,{" "}
          <code className="font-mono">list_issues</code>,{" "}
          <code className="font-mono">create_issue</code>,{" "}
          <code className="font-mono">list_people</code>.
        </p>
        <CodeBlock label="Wire it up" code={MCP_EXAMPLE} />
      </section>

      {/* ─── Auth + scopes ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-[16px] tracking-[0.18em] uppercase text-gold-400">
          Auth & scopes
        </h2>
        <ul className="text-[13px] text-text-secondary leading-relaxed space-y-1.5 list-disc pl-5">
          <li>
            Keys look like <code className="font-mono">oc_&lt;12-char prefix&gt;_&lt;48-char secret&gt;</code>.
          </li>
          <li>
            Default scopes: <code className="font-mono">read</code> +{" "}
            <code className="font-mono">write</code>. Both REST and MCP gate on
            them.
          </li>
          <li>
            Keys are hashed at rest (SHA-256) — we display the full key once on
            creation and never again.
          </li>
          <li>
            Revoke a key from Settings; calls authenticating with it start
            failing on the next request (no propagation lag — checked per call).
          </li>
        </ul>
      </section>
    </div>
  )
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="rounded-sm border border-border-orage bg-bg-3">
      <div className="px-3 py-1.5 border-b border-border-orage font-display text-[10px] tracking-[0.18em] uppercase text-text-muted">
        {label}
      </div>
      <pre className="px-3 py-3 text-[11px] font-mono text-text-primary overflow-x-auto whitespace-pre">
        {code}
      </pre>
    </div>
  )
}
