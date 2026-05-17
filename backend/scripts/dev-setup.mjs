import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const projectRoot = resolve(root, "..");

dotenv.config({ path: resolve(projectRoot, ".env.local") });
dotenv.config({ path: resolve(projectRoot, ".env") });

const clientName =
  process.env["CLIENT_NAME"] || process.env["VITE_CLIENT_NAME"] || "developers";
const dbName = clientName === "stuco" ? "dev-stuco.db" : "dev.db";
process.env["DATABASE_URL"] = `file:./${dbName}`;

const dbPath = resolve(root, "prisma", dbName);

if (existsSync(dbPath)) {
  console.log(
    `[dev-setup] Database exists (${dbName}) — running any pending migrations...`,
  );
  try {
    execSync("npx prisma migrate deploy", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
  } catch {
    // migrate deploy might fail if no migrations exist yet, fall through
  }
} else {
  console.log(
    `[dev-setup] Creating fresh database (${dbName}) with seed data...`,
  );
  try {
    execSync("npx prisma migrate dev --name init", {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
  } catch (err) {
    console.error(`[dev-setup] Migration failed:`, err.message);
    process.exit(1);
  }
}

execSync("npx prisma generate", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
