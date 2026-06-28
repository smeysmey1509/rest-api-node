import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./packages/shared/src"),
      "@services": path.resolve(__dirname, "./services"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Integration tests start MongoMemoryServer/MongoMemoryReplSet.
    // They can take more than Vitest's default 5s/10s on local machines.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    exclude: ["node_modules", "dist"],

    // The tests share Mongoose's global connection, so running test files in
    // parallel can cause connection teardown/setup races and slow hooks.
    fileParallelism: false,
  },
});
