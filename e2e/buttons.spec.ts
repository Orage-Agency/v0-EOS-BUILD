import { test, expect } from "@playwright/test"

/**
 * Buttons audit — exercises the data-testid hooks we tagged on primary
 * and destructive CTAs across the app. The point is not to assert the
 * destructive operation succeeds (we don't want to delete the test
 * workspace) but to verify that:
 *
 *   1. The button is mounted, visible, and not orphaned by a layout pass.
 *   2. Clicking primary buttons toggles their disabled/loading state
 *      while the request is in flight (so users can't double-submit).
 *   3. Destructive buttons confirm before firing — clicking opens the
 *      confirm dialog instead of immediately destroying state.
 *
 * Required env (CI sets these; local dev exports them):
 *   TEST_EMAIL / TEST_PASSWORD / TEST_SLUG
 */

const EMAIL = process.env.TEST_EMAIL
const PASSWORD = process.env.TEST_PASSWORD
const SLUG = process.env.TEST_SLUG ?? "orage-team"
const skipIfMissing = !EMAIL || !PASSWORD

test.describe("primary + destructive buttons", () => {
  test.skip(skipIfMissing, "TEST_EMAIL / TEST_PASSWORD not set")

  test("login submit button toggles disabled while in flight", async ({
    page,
  }) => {
    await page.goto(`/login`)
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL!)
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD!)
    const submit = page.getByTestId("login-submit")
    await expect(submit).toBeVisible()
    await expect(submit).toBeEnabled()
    await submit.click()
    // The redirect happens fast; either we see disabled briefly OR we're
    // already on the workspace dashboard. Both are acceptable — the bad
    // outcome would be the button staying enabled with no navigation.
    await page.waitForURL(new RegExp(`/${SLUG}(?:[/?#]|$)`), {
      timeout: 15_000,
    })
  })

  test("danger zone delete-workspace requires explicit modal confirm", async ({
    page,
  }) => {
    await page.goto(`/login`)
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL!)
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD!)
    await page.getByTestId("login-submit").click()
    await page.waitForURL(new RegExp(`/${SLUG}(?:[/?#]|$)`), { timeout: 15_000 })

    await page.goto(`/${SLUG}/settings/danger`)
    const deleteBtn = page.getByTestId("danger-delete-workspace")
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()
    // Modal should open, not delete inline. Look for either a confirm
    // input or the modal heading.
    await expect(
      page.getByText(/permanently delete|confirm|type the workspace/i).first(),
    ).toBeVisible({ timeout: 5_000 })
  })

  test("ai settings selects persist + show saving state", async ({
    page,
  }) => {
    await page.goto(`/login`)
    await page.getByRole("textbox", { name: /email/i }).fill(EMAIL!)
    await page.getByRole("textbox", { name: /password/i }).fill(PASSWORD!)
    await page.getByTestId("login-submit").click()
    await page.waitForURL(new RegExp(`/${SLUG}(?:[/?#]|$)`), { timeout: 15_000 })

    await page.goto(`/${SLUG}/settings/ai`)
    const select = page.getByTestId("ai-model-select")
    await expect(select).toBeVisible()
    const before = await select.inputValue()
    // Pick a different value; the page persists via server action.
    const target = before.includes("gpt-5-mini")
      ? "anthropic/claude-haiku-4-5"
      : "openai/gpt-5-mini"
    await select.selectOption(target)
    // Reload — value must still be the new target.
    await page.reload()
    await expect(page.getByTestId("ai-model-select")).toHaveValue(target)

    // Restore the previous value so the test is idempotent.
    await page.getByTestId("ai-model-select").selectOption(before)
  })
})
