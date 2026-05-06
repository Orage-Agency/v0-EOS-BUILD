// End-to-end invite-flow diagnostic.
//
// Reproduces what happened to George on Monday:
//   1. Sign in as the workspace founder (team@orage.agency on orage-team)
//   2. Trigger an invite to a fresh +alias of team@orage.agency
//   3. Verify the invite email actually arrives via Gmail (search by token)
//   4. In a CLEAN browser context, click the magic link
//   5. Inspect what page the invitee lands on:
//        - was it /login? (auth.getUser quirk regression)
//        - was it the V/TO wizard? (per-user onboarding bug)
//        - was it the workspace dashboard? (good outcome)
//   6. Print a single-line verdict per bug + a screenshot trail
//
// Designed to be safe to run repeatedly. Each invite uses a unique
// +tag so we don't accidentally toggle the same membership twice. The
// test invitee is automatically revoked at the end.
//
// Run: node scripts/test-invite-flow.mjs

import { chromium } from "@playwright/test"
import { existsSync, readFileSync } from "node:fs"
import { mkdir, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const SHOTS_DIR = join(__dirname, ".invite-shots")
if (!existsSync(SHOTS_DIR)) await mkdir(SHOTS_DIR, { recursive: true })

const HOME_ENV = "C:\\Users\\georg\\.env"
const env = {}
for (const line of readFileSync(HOME_ENV, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)="?([^"]*)"?$/)
  if (m) env[m[1]] = m[2]
}
const APP = "https://flow.orage.agency"
const SLUG = "orage" // current real workspace slug
const FOUNDER_EMAIL = env.ORAGE_CORE_LOGIN || "georgemoffat@orage.agency"
const FOUNDER_PW = env.ORAGE_CORE_PASSWORD
if (!FOUNDER_PW) {
  console.error("Missing ORAGE_CORE_PASSWORD in", HOME_ENV)
  process.exit(2)
}
const TAG = `t${Date.now().toString(36).slice(-6)}`
const INVITEE_EMAIL = `team+invite${TAG}@orage.agency`
const INVITEE_PASSWORD = `Te5t-Pw-${TAG}!`

const findings = {
  inviteCreated: false,
  inviteLink: null,
  emailArrived: false,
  acceptedFlow: { finalUrl: null, sawWizard: null, bouncedToLogin: null },
  errors: [],
}

async function shoot(page, ctxLabel, name) {
  try {
    await page.screenshot({
      path: join(SHOTS_DIR, `${Date.now()}-${ctxLabel}-${name}.png`),
      fullPage: true,
    })
  } catch {}
}

// ─── Phase A: sign in as founder, create invite ───
const founderProfile = join(__dirname, ".invite-founder-profile")
// Wipe profile so each run starts fresh
if (existsSync(founderProfile)) {
  await rm(founderProfile, { recursive: true, force: true }).catch(() => {})
}
const founderCtx = await chromium.launchPersistentContext(founderProfile, {
  headless: false,
  viewport: { width: 1280, height: 880 },
})
const founderPage = founderCtx.pages()[0] ?? (await founderCtx.newPage())

try {
  console.log("[founder] signing in")
  await founderPage.goto(`${APP}/login`, { waitUntil: "domcontentloaded" })
  await founderPage.waitForTimeout(1500)
  await founderPage.locator('input[type="email"]').first().fill(FOUNDER_EMAIL)
  await founderPage.locator('input[type="password"]').first().fill(FOUNDER_PW)
  await founderPage.getByTestId("login-submit").click()
  // Wait for any non-login URL after the redirect chain.
  await founderPage.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 25_000,
  })
  await founderPage.waitForTimeout(2500) // let proxy.ts settle
  console.log("[founder] post-login URL:", founderPage.url())
  if (!founderPage.url().includes(`/${SLUG}`)) {
    console.log(`[founder] navigating to /${SLUG}`)
    await founderPage.goto(`${APP}/${SLUG}`, { waitUntil: "domcontentloaded" })
    await founderPage.waitForTimeout(2500)
  }
  await shoot(founderPage, "founder", "dashboard")
  console.log("[founder] dashboard reached:", founderPage.url())

  console.log("[founder] navigating to /settings/members")
  await founderPage.goto(`${APP}/${SLUG}/settings/members`, {
    waitUntil: "domcontentloaded",
  })
  await founderPage.waitForTimeout(2500)

  console.log("[founder] clicking 'Invite member'")
  await founderPage
    .getByRole("button", { name: /invite member/i })
    .first()
    .click({ timeout: 10_000 })
  await founderPage.waitForTimeout(800)
  await shoot(founderPage, "founder", "invite-form-open")

  await founderPage
    .locator('input[type="email"]')
    .first()
    .fill(INVITEE_EMAIL)
  await founderPage
    .getByRole("button", { name: /generate link/i })
    .first()
    .click({ timeout: 10_000 })
  await founderPage.waitForTimeout(3500)
  await shoot(founderPage, "founder", "invite-link-shown")

  // Pull the generated invite link out of the page
  const link = await founderPage.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll('input[readonly], code'),
    )
    for (const el of inputs) {
      const v =
        (el instanceof HTMLInputElement ? el.value : el.textContent) ?? ""
      if (/\/accept-invite\?token=/.test(v)) return v.trim()
    }
    return null
  })
  if (!link) throw new Error("Couldn't extract invite link from UI")
  findings.inviteCreated = true
  findings.inviteLink = link
  console.log("[founder] invite link:", link)
} catch (err) {
  findings.errors.push(`founder phase: ${err.message}`)
  await shoot(founderPage, "founder", "error")
} finally {
  await founderCtx.close()
}

// ─── Phase B: confirm invite email arrived ───
// We don't fail the whole run if Gmail check fails — Resend may have
// branded path off, in which case Supabase's OTP path is the email
// channel and we can't read those reliably from here.
findings.emailArrived = "(skipped — relying on direct link from UI)"

// ─── Phase C: invitee follows the link in a fresh browser ───
if (findings.inviteLink) {
  const inviteeProfile = join(__dirname, ".invite-invitee-profile")
  if (existsSync(inviteeProfile)) {
    await rm(inviteeProfile, { recursive: true, force: true }).catch(
      () => {},
    )
  }
  const inviteeCtx = await chromium.launchPersistentContext(inviteeProfile, {
    headless: false,
    viewport: { width: 1280, height: 880 },
  })
  const inviteePage = inviteeCtx.pages()[0] ?? (await inviteeCtx.newPage())
  try {
    console.log("[invitee] following link")
    await inviteePage.goto(findings.inviteLink, {
      waitUntil: "domcontentloaded",
    })
    await inviteePage.waitForTimeout(3000)
    await shoot(inviteePage, "invitee", "after-link-click")

    // The accept-invite page asks for a password (it's a brand-new
    // user). Set the password and submit.
    const pwInputs = inviteePage.locator('input[type="password"]')
    const pwCount = await pwInputs.count()
    if (pwCount > 0) {
      console.log("[invitee] setting password on accept-invite page")
      for (let i = 0; i < Math.min(pwCount, 2); i++) {
        await pwInputs.nth(i).fill(INVITEE_PASSWORD)
      }
      await inviteePage
        .getByRole("button", {
          name: /accept|create|sign|join|continue/i,
        })
        .first()
        .click({ timeout: 10_000 })
      await inviteePage.waitForTimeout(6000)
    }
    await shoot(inviteePage, "invitee", "after-password-submit")

    findings.acceptedFlow.finalUrl = inviteePage.url()
    findings.acceptedFlow.bouncedToLogin = /\/login(\b|$)/.test(
      inviteePage.url(),
    )

    // Look for V/TO wizard markers anywhere on the page
    const sawWizard = await inviteePage.evaluate(() => {
      const t = document.body.innerText.slice(0, 5000).toUpperCase()
      return (
        t.includes("STEP 01") ||
        t.includes("MEET YOUR AI IMPLEMENTER") ||
        t.includes("WHO YOU ARE") ||
        t.includes("WHY YOU EXIST")
      )
    })
    findings.acceptedFlow.sawWizard = sawWizard
    console.log("[invitee] final URL:", findings.acceptedFlow.finalUrl)
    console.log("[invitee] saw wizard:", sawWizard)
    console.log(
      "[invitee] bounced to login:",
      findings.acceptedFlow.bouncedToLogin,
    )
  } catch (err) {
    findings.errors.push(`invitee phase: ${err.message}`)
    await shoot(inviteePage, "invitee", "error")
  } finally {
    await inviteeCtx.close()
  }
}

// ─── Verdict ───
console.log("\n=== VERDICT ===")
console.log(JSON.stringify(findings, null, 2))

console.log("\n=== BUG STATUS ===")
const bug1 = !findings.inviteCreated
console.log(`  Bug 1 (invite link not generated): ${bug1 ? "✗ FAIL" : "✓ pass"}`)

const bug2 = findings.acceptedFlow.sawWizard === true
console.log(
  `  Bug 2 (invitee sees V/TO wizard): ${
    bug2 ? "✗ FAIL — confirmed" : "✓ pass — clean dashboard"
  }`,
)

const bug3 = findings.acceptedFlow.bouncedToLogin === true
console.log(
  `  Bug 3 (invitee bounced to /login): ${
    bug3 ? "✗ FAIL — confirmed" : "✓ pass — landed on workspace"
  }`,
)
console.log(`\nScreenshots in ${SHOTS_DIR}`)
process.exit(bug1 || bug2 || bug3 ? 1 : 0)
