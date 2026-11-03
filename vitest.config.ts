import path from "node:path";
import { defineConfig } from "vitest/config";

// Tests run against a separate Postgres database (created by docker-compose).
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://school:school@localhost:5432/school_test";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
      TOKEN_SECRET: "test-secret",
      BASE_URL: "http://localhost:3000",
      BLOB_READ_WRITE_TOKEN: "",
    },
    globalSetup: "./tests/global-setup.ts",
    fileParallelism: false,
  },
});
