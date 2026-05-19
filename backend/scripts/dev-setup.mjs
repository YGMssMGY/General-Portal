import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const projectRoot = resolve(root, "..");

dotenv.config({ path: resolve(projectRoot, ".env.local") });
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

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
}

for (const db of DATABASES) {
  process.env["DATABASE_URL"] = db.url;
  console.log(`\n[dev-setup] Setting up ${db.name} database...`);

  try {
    run("npx prisma migrate deploy", root);
    console.log(`[dev-setup] Migrations applied for ${db.name}`);
  } catch {
    console.log(
      `[dev-setup] No existing migrations — creating initial migration for ${db.name}...`,
    );
    try {
      run("npx prisma migrate dev --name init", root);
    } catch (err) {
      console.error(
        `[dev-setup] Migration failed for ${db.name}:`,
        err.message,
      );
      process.exit(1);
    }
  }
}

run("npx prisma generate", root);
console.log("\n[dev-setup] Done — both databases ready");
