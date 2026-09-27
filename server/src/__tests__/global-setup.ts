import { execSync } from "child_process";
import path from "path";

/**
 * Runs once before the whole test suite. Uses Prisma's own `migrate reset`
 * (rather than manually deleting the SQLite file) because on Windows a
 * lingering file lock from the previous process can make a manual
 * unlink()+migrate sequence silently no-op, leaving stale rows from the last
 * run and causing unique-constraint collisions in a fresh test run.
 */
export default async function globalSetup() {
  execSync("npx prisma migrate reset --force --skip-seed --skip-generate", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: "file:./prisma/test.db" },
    stdio: "inherit",
  });
}
