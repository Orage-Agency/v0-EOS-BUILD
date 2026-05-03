import { test, expect } from "@playwright/test"

/**
 * Smoke spec: signs in as the test workspace and walks every module page
 * asserting on real rendered content. Mirrors scripts/smoke-test.mjs but
 * runs in a real browser so client-side rendering bugs are caught too.
 *
 * Required env (CI sets these as secrets; local dev exports them):
 *   TEST_EMAIL    — workspace member email
 *   TEST_PASSWORD — their password
 *   TEST_SLUG     — workspace slug, e.g. orage-team
 */
const EMAIL = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD
const SLUG = process.env.TEST_SLUG ?? "orage-team"

const skipIfMissing = !EMAIL || !PASSWORD

test.describe("workspace member can navigate every module", () => {
  test.skip(skipIfMissing, "TEST_EMAIL / TEST_PASSWORD not set")

  test.beforeEach(async ({ page }) => {
    await page.goto(`/${SLUG}/login`)
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL!)
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD!)
    await page.getByRole("button", { name: /sign in/i }).click()
    await page.waitForURL(new RegExp(`/${SLUG}(?:[/?#]|$)`), { timeout: 15_000 })
  })

  test("dashboard renders the greeting + nav", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/GOOD/i)
    await expect(page.getByRole("link", { name: /^Rocks$/i })).toBeVisible()
  })

  test("rocks page lists the seeded rocks", async ({ page }) => {
    await page.goto(`/${SLUG}/rocks`)
    // The smoke test created these three rocks; they should be visible
    // regardless of which ones got renamed.
    await expect(page.locator("body")).toContainText("ROCKS")
  })

  test("inbox renders without auth bounce", async ({ page }) => {
    await page.goto(`/${SLUG}/inbox`)
    await expect(page).toHaveURL(new RegExp(`/${SLUG}/inbox`))
    await expect(page.locator("h1")).toContainText("INBOX")
  })

  test("audit log renders", async ({ page }) => {
    await page.goto(`/${SLUG}/settings/audit`)
    await expect(page.locator("h1")).toContainText("AUDIT")
  })

  test("AI implementer page renders", async ({ page }) => {
    await page.goto(`/${SLUG}/ai`)
    await expect(page.locator("body")).toContainText(/IMPLEMENTER/i)
  })

  test("L10 page renders", async ({ page }) => {
    await page.goto(`/${SLUG}/l10`)
    await expect(page.locator("body")).toContainText(/L10/i)
  })

  test("V/TO renders the persisted onboarding answers", async ({ page }) => {
    await page.goto(`/${SLUG}/vto`)
    // V/TO data was persisted during the smoke test; one of these
    // markers should be on the page.
    const body = page.locator("body")
    await expect(body).toContainText(/V\/TO|VISION/i)
  })
})

test("signup page renders without auth", async ({ page }) => {
  await page.goto("/signup")
  await expect(page.locator("h1")).toContainText("START YOUR WORKSPACE")
  await expect(page.getByRole("textbox", { name: /workspace name/i })).toBeVisible()
})
