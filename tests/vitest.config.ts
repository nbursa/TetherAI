import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", "dist/**", "examples/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "examples/**",
        "tests/**",
        "**/*.d.ts",
        "**/*.config.*",
      ],
      all: true,
      clean: true,
    },
  },
  resolve: {
    alias: {
      "@tetherai/openai": resolve(__dirname, "../packages/provider/openai/src"),
      "@tetherai/anthropic": resolve(
        __dirname,
        "../packages/provider/anthropic/src"
      ),
    },
  },
});
