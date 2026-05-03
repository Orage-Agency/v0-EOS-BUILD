import { defineConfig } from "@playwright/test"

/**
 * Playwright e2e config. Runs the specs in `e2e/` against either:
 *   - a locally-running `next dev` (when BASE_URL is unset, started via
 *     webServer below), or
 *   - a deployed URL (when BASE_URL is set, e.g. CI hitting a preview).
 *
 * To run locally:    pnpm test:e2e
 * To run against prod URL:
 *   BASE_URL=https://v0-project-foundation-setup-nu.vercel.app TEST_EMAIL=team@orage.agency TEST_PASSWORD=... pnpm test:e2e
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Only spin up `next dev` if we're not pointing at a remote URL.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
})
