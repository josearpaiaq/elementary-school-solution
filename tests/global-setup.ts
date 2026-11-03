import { execSync } from "node:child_process";

/** Recreates the test database from the Prisma schema. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://school:school@localhost:5432/school_test";
  execSync("npx prisma db push --force-reset --skip-generate", {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: "ignore",
  });
}
