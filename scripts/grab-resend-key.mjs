// One-shot: log into resend.com with Google SSO using the
// team@orage.agency credentials from the home .env, create an API key,
// print it to stdout. The browser window is visible so you can see
// what's happening + tap through any 2FA push that appears.
//
// Run: node scripts/grab-resend-key.mjs

import { chromium } from "@playwright/test"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROFILE_DIR = join(__dirname, ".resend-profile")
const SHOTS_DIR = join(__dirname, ".resend-shots")

const HOME_ENV = "C:\\Users\\georg\\.env"
const env = {}
for (const line of readFileSync(HOME_ENV, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/)
  if (m) env[m[1]] = m[2]
}
const EMAIL = env.GOOGLE_TEAM_EMAIL
const PASSWORD = env.GOOGLE_TEAM_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.error("Missing GOOGLE_TEAM_EMAIL/PASSWORD in", HOME_ENV)
  process.exit(2)
}

const browser = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: { width: 1280, height: 860 },
  // Slow down a touch so we don't trip Google's anti-automation heuristics.
  slowMo: 80,
})

async function shot(page, name) {
  try {
    await page.screenshot({
      path: join(SHOTS_DIR, `${Date.now()}-${name}.png`),
      fullPage: false,
    })
  } catch {
    /* ignore */
  }
}

const page = browser.pages()[0] ?? (await browser.newPage())

try {
  console.log("→ resend.com/login")
  await page.goto("https://resend.com/login", { waitUntil: "domcontentloaded" })

  // If we're already authed (cookies from a prior run) we'll get
  // bounced to the dashboard — short-circuit to API keys.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  const url1 = page.url()
  if (!/login/i.test(url1)) {
    console.log("✓ already signed in:", url1)
  } else {
    console.log("→ clicking Continue with Google")
    // Resend's button text varies — match anything containing "Google".
    const googleBtn = page.getByRole("button", { name: /google/i }).first()
    await googleBtn.click({ timeout: 15_000 })

    // Google login page
    await page.waitForURL(/accounts\.google\.com/, { timeout: 30_000 })
    console.log("→ on Google login page")
    await shot(page, "google-1")

    // Email
    const emailInput = page.locator('input[type="email"]').first()
    await emailInput.waitFor({ timeout: 15_000 })
    await emailInput.fill(EMAIL)
    await page.getByRole("button", { name: /next/i }).click()

    // Password (sometimes there's a "Choose account" page first)
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
    const pwInput = page.locator('input[type="password"]').first()
    await pwInput.waitFor({ timeout: 20_000 })
    await pwInput.fill(PASSWORD)
    await page.getByRole("button", { name: /next/i }).click()

    // From here we wait for the redirect back to resend.com. If 2FA
    // prompts, the user has 90s to tap through on their phone.
    console.log("→ waiting for resend.com redirect (or 2FA prompt)…")
    await page.waitForURL(/resend\.com/, { timeout: 90_000 })
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
    console.log("✓ back on resend.com:", page.url())
  }

  // Navigate to API keys
  await page.goto("https://resend.com/api-keys", {
    waitUntil: "domcontentloaded",
  })
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
  await shot(page, "apikeys-list")

  // "Create API Key" button — match a few common labels.
  const createBtn = page
    .getByRole("button", {
      name: /create api key|new api key|\+ create/i,
    })
    .first()
  await createBtn.click({ timeout: 15_000 })

  // Name field
  const nameInput = page.locator("input").first()
  await nameInput.waitFor({ timeout: 10_000 })
  await nameInput.fill("Orage Core production")

  // Permission — leave default (full access) but ensure "Sending access"
  // works too. We don't need to fiddle if defaults are already that.

  // Click create / submit
  const submitBtn = page
    .getByRole("button", {
      name: /^(create|add|save)$/i,
    })
    .last()
  await submitBtn.click({ timeout: 10_000 })

  // The key is shown once. Grab it from the modal/panel that appears.
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
  await shot(page, "apikey-created")

  // Resend renders the key inside a code/pre element with the prefix re_
  const keyText = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("code, pre, input"))
    for (const el of all) {
      const v = (el instanceof HTMLInputElement ? el.value : el.textContent) ?? ""
      const m = v.match(/^re_[A-Za-z0-9_]{20,}$/)
      if (m) return m[0]
    }
    return null
  })

  if (keyText) {
    console.log("\n=== RESEND_API_KEY ===")
    console.log(keyText)
    console.log("======================")
  } else {
    console.log(
      "\n[!] Couldn't auto-extract the key from the DOM. Check the screenshots in",
      SHOTS_DIR,
    )
    console.log("    The browser is still open — copy the key manually.")
  }
} catch (err) {
  console.error("\n✗ FAILED:", err instanceof Error ? err.message : err)
  await shot(page, "error")
  console.error("Screenshots saved to", SHOTS_DIR)
} finally {
  // Leave the browser open for 30s so the user can inspect / copy
  // anything visible before we close.
  await new Promise((r) => setTimeout(r, 30_000))
  await browser.close()
}
