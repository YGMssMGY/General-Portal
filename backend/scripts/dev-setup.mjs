import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Prisma needs DATABASE_URL in the environment
process.env["DATABASE_URL"] = process.env["DATABASE_URL"] || "file:./dev.db";

const dbPath = resolve(root, "prisma", "dev.db");

if (existsSync(dbPath)) {
  console.log("[dev-setup] Found existing dev.db — not resetting.");
} else {
  console.log("[dev-setup] Creating and seeding fresh SQLite database...");
  try {
    execSync("npx prisma migrate dev --name init --skip-generate", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    execSync("npx prisma db seed", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    console.log("[dev-setup] Database created and seeded.");
  } catch (e) {
    console.error("[dev-setup] Setup failed:", e.message);
    process.exit(1);
  }
}

execSync("npx prisma generate", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
