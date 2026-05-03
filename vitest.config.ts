import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: [
      // The `server-only` package throws under any non-RSC import. In tests
      // we want to load server modules directly, so swap it for a no-op.
      // Same story for `client-only`.
      { find: /^server-only$/, replacement: new URL("./test/empty.ts", import.meta.url).pathname },
      { find: /^client-only$/, replacement: new URL("./test/empty.ts", import.meta.url).pathname },
    ],
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // e2e/ is owned by Playwright, not Vitest.
    exclude: ["node_modules", ".next", "e2e", "**/*.spec.ts"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
})
