import { defineConfig } from "vitest/config";

process.env.ENCRYPTION_SECRET = "test-secret-that-is-at-least-32-chars-long-for-hmac-sha256";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-chars-long-for-hmac-sha256";
process.env.NODE_ENV = "test";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**", "src/server.ts"],
    },
  },
});
