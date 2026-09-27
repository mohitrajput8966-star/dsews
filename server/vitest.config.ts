import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "file:./prisma/test.db",
      JWT_SECRET: "test-only-secret",
      JWT_EXPIRES_IN: "1h",
    },
    globalSetup: "./src/__tests__/global-setup.ts",
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false, // all test files share one SQLite file
  },
});
