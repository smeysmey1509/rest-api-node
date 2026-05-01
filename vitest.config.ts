import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Integration tests start MongoMemoryServer/MongoMemoryReplSet.
    // They can take more than Vitest's default 5s/10s on local machines.
    testTimeout: 30_000,
    hookTimeout: 60_000,

    // The tests share Mongoose's global connection, so running test files in
    // parallel can cause connection teardown/setup races and slow hooks.
    fileParallelism: false,
  },
});
