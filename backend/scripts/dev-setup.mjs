import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

process.env["DATABASE_URL"] = process.env["DATABASE_URL"] || "file:./dev.db";

const dbPath = resolve(root, "prisma", "dev.db");

if (existsSync(dbPath)) {
  console.log("[dev-setup] Resetting database...");
  unlinkSync(dbPath);
  const journal = resolve(root, "prisma", "dev.db-journal");
  if (existsSync(journal)) unlinkSync(journal);
}

console.log("[dev-setup] Creating fresh database with seed data...");
execSync("npx prisma migrate dev --name init", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
