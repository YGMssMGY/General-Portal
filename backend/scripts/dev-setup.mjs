import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const projectRoot = resolve(root, "..");

dotenv.config({ path: resolve(projectRoot, ".env") });

const DB_URL_DEV =
  process.env["DATABASE_URL_DEVELOPERS"] ||
  "postgresql://localhost:5432/general_portal_dev";
const DB_URL_STUCO =
  process.env["DATABASE_URL_STUCO"] ||
  "postgresql://localhost:5432/general_portal_stuco";

const DATABASES = [
  { name: "developers", url: DB_URL_DEV },
  { name: "stuco", url: DB_URL_STUCO },
];

for (const db of DATABASES) {
  const env = { ...process.env, DATABASE_URL: db.url };
  console.log(`\n[dev-setup] Setting up ${db.name} database...`);

  try {
    execSync("npx prisma migrate deploy", { cwd: root, stdio: "inherit", env });
    console.log(`[dev-setup] Migrations applied for ${db.name}`);
  } catch {
    console.log(`[dev-setup] Creating initial migration for ${db.name}...`);
    try {
      execSync("npx prisma migrate dev --name init", {
        cwd: root,
        stdio: "inherit",
        env,
      });
    } catch (err) {
      console.error(
        `[dev-setup] Migration failed for ${db.name}:`,
        err.message,
      );
      process.exit(1);
    }
  }
}

execSync("npx prisma generate", {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

console.log("\n[dev-setup] Done — both databases ready");
