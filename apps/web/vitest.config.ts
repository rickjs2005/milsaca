import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Config Vitest pro @milsaca/web. Foco em **unit tests puros**
 * (schemas, normalizadores, mappers) — não tenta rodar Server
 * Components nem cobrir RLS (isso fica no smoke-* via service role).
 *
 * Coverage opcional; rode com `pnpm --filter @milsaca/web test --coverage`.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist", "scripts/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/page.tsx",
        "src/**/layout.tsx",
        "src/**/loading.tsx",
        "src/middleware.ts",
      ],
    },
  },
});
