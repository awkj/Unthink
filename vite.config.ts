import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import topLevelAwait from "vite-plugin-top-level-await"
import wasm from "vite-plugin-wasm"
import { defineConfig } from "vite"
import { execSync } from "node:child_process"
import IstanbulPlugin from "./tooling/vite-plugin-istanbul/index"
import { commonFilesPlugin } from "./tooling/vite-plugin-common-files"
import { unusedFilesPlugin } from "./tooling/vite-plugin-detect-unused-files/detect-unused-files"

function getGitCommitHash() {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim()
  } catch {
    return "unknown"
  }
}

const base = process.env.USE_RELATIVE_BASE === "true" ? "./" : "/"
const tauriDevHost = process.env.TAURI_DEV_HOST
const tauriDevPort = Number(process.env.TAURI_DEV_PORT ?? 4000)

export default defineConfig({
  base,
  server: tauriDevHost
    ? {
        hmr: {
          protocol: "ws",
          host: tauriDevHost,
          clientPort: tauriDevPort,
        },
      }
    : undefined,
  define: {
    __PROJECT_COMMIT_HASH__: JSON.stringify(getGitCommitHash()),
  },
  build: {
    target: "esnext",
    sourcemap: true,
  },
  resolve: {
    alias: {
      "@": path.join(import.meta.dirname, "./src"),
    },
  },

  plugins: [
    tailwindcss(),
    topLevelAwait({
      promiseExportName: "__tla",
      promiseImportName: (i) => `__tla_${i}`,
    }),
    react(),
    wasm(),
    IstanbulPlugin({
      enabled: process.env.VITE_COVERAGE === "true",
      exclude: ["**/node_modules/**"],
      include: ["**/*.ts", "**/*.tsx"],
    }),
    unusedFilesPlugin({
      exclude: ["src/cli/**", "src/core/time/getTimeStampFromDateStr.ts", "src/core/time/isStartOfDay.ts", "**/*.d.ts"],
    }),
    commonFilesPlugin({
      entries: ["src/desktop/main.tsx", "src/mobile/main.tsx"],
      exclude: [
        "src/nls.ts",
        "src/core/**",
        "src/services/**/*.ts",
        "src/ui/**",
        "src/plugins/**",
        "src/locales/**",
        "src/testIds.ts",
      ],
      validate: (files) => {
        console.log("\n┌─────────────────────────────────────────────────┐")
        console.log(`│ Common files between desktop and mobile: ${String(files.length).padEnd(5)} │`)
        console.log("└─────────────────────────────────────────────────┘")
        if (files.length > 0) {
          files.forEach((file, index) => {
            const prefix = index === files.length - 1 ? "└──" : "├──"
            console.log(`${prefix} ${file}`)
          })
          console.log("")
          throw new Error("Found common files between desktop and mobile!")
        }
      },
    }),
  ],
})
