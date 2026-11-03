/**
 * Stops destructive scripts (database reset, demo seed) unless DATABASE_URL points
 * to a local database. Pass --force to override.
 */
const url = process.env.DATABASE_URL ?? "";
let host = "";
try {
  host = new URL(url).hostname;
} catch {
  // An unparsable URL is treated as non-local.
}

if (!["localhost", "127.0.0.1"].includes(host) && !process.argv.includes("--force")) {
  console.error(
    `Refusing to wipe the database at "${host || "unknown host"}": destructive scripts only run against localhost. Pass --force to override.`,
  );
  process.exit(1);
}
