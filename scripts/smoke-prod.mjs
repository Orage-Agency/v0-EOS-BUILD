// Production smoke + screenshot run.
// Walks the unauthenticated public surfaces (homepage, /signup, /login),
// captures desktop + mobile screenshots, and pings the API + MCP routes
// to verify auth gates fire correctly.
//
// Output goes to scripts/.smoke-screenshots/.

import { chromium } from "@playwright/test"
import { mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, ".smoke-screenshots")

const BASE =
  process.env.SMOKE_BASE_URL ??
  "https://v0-project-foundation-setup-nu.vercel.app"

async function shoot(page, name) {
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path, fullPage: true })
  console.log(`  📸 ${name}.png`)
}

async function pingApi(label, url, headers = {}) {
  try {
    const res = await fetch(url, { headers })
    const ct = res.headers.get("content-type") ?? ""
    let body = ""
    try {
      body = ct.includes("application/json")
        ? JSON.stringify(await res.json()).slice(0, 120)
        : (await res.text()).slice(0, 80)
    } catch {
      /* noop */
    }
    console.log(`  ${label.padEnd(28)}  ${res.status}  ${body}`)
  } catch (err) {
    console.log(`  ${label.padEnd(28)}  ERROR  ${err}`)
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })

  const browser = await chromium.launch()
  // ── Desktop pass ─────────────────────────────────────────
  console.log(`\n[desktop] ${BASE}`)
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const dp = await desktop.newPage()
  await dp.goto(BASE, { waitUntil: "domcontentloaded" })
  await dp.waitForTimeout(1500)
  await shoot(dp, "01-home-desktop")
  await dp.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" })
  await dp.waitForTimeout(1500)
  await shoot(dp, "02-signup-desktop")
  await dp.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" })
  await dp.waitForTimeout(1500)
  await shoot(dp, "03-login-desktop")
  await desktop.close()

  // ── Mobile pass (iPhone-ish) ─────────────────────────────
  console.log(`\n[mobile] ${BASE}`)
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  })
  const mp = await mobile.newPage()
  await mp.goto(BASE, { waitUntil: "domcontentloaded" })
  await mp.waitForTimeout(1500)
  await shoot(mp, "04-home-mobile")
  await mp.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" })
  await mp.waitForTimeout(1500)
  await shoot(mp, "05-signup-mobile")
  await mobile.close()

  await browser.close()

  // ── API + MCP probes ─────────────────────────────────────
  console.log(`\n[api probes]`)
  await pingApi("manifest.webmanifest", `${BASE}/manifest.webmanifest`)
  await pingApi("sw.js", `${BASE}/sw.js`)
  await pingApi("API v1 tasks (no auth)", `${BASE}/api/v1/tasks`)
  await pingApi("MCP GET (no auth)", `${BASE}/api/mcp`)
  await pingApi("Search no-slug", `${BASE}/api/search?q=test`)

  // ── Header check ─────────────────────────────────────────
  console.log(`\n[security headers]`)
  const headRes = await fetch(BASE, { method: "HEAD" })
  const wanted = [
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "strict-transport-security",
    "content-security-policy",
  ]
  for (const h of wanted) {
    const v = headRes.headers.get(h)
    console.log(`  ${h.padEnd(28)}  ${v ? "✓ " + v.slice(0, 60) : "✗ missing"}`)
  }

  console.log(`\nDone. Screenshots in ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
