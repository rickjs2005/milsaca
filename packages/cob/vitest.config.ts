import { defineConfig } from "vitest/config";

/**
 * Config Vitest pro @milsaca/cob — pacote de funções puras
 * (classificação COB, IN 8/2003). Sem DOM, sem I/O: ambiente node.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
  },
});
