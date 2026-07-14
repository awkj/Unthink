import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "threads",
    isolate: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        // Baseline the current suite so coverage cannot regress while tests
        // are added incrementally for the remaining model and action paths.
        lines: 40,
        branches: 30,
        functions: 50,
      },
    },
  },
})
