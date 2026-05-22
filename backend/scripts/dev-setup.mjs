import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const projectRoot = resolve(root, "..");

dotenv.config({ path: resolve(projectRoot, ".env") });

function createDatabaseIfMissing(dbUrl) {
  try {
    const u = new URL(dbUrl);
    const dbName = u.pathname.replace(/^\//, "");
    u.pathname = "/postgres";
    const adminUrl = u.toString();

    const exists = execSync(
      `npx prisma db execute --url "${adminUrl}" --stdin`,
      {
        cwd: root,
        input: `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`,
        encoding: "utf8",
        timeout: 5000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    if (!exists.trim()) {
      console.log(`[dev-setup] Database "${dbName}" not found, creating...`);
      execSync(`npx prisma db execute --url "${adminUrl}" --stdin`, {
        cwd: root,
        input: `CREATE DATABASE "${dbName}"`,
        encoding: "utf8",
        timeout: 10000,
        stdio: ["pipe", "pipe", "pipe"],
      });
    }
  } catch {
    // Cannot check — will fail gracefully at migrate step
  }
}

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

  createDatabaseIfMissing(db.url);

  try {
    execSync("npx prisma db push --accept-data-loss", {
      cwd: root,
      stdio: "inherit",
      env,
    });
    console.log(`[dev-setup] Schema pushed for ${db.name}`);
  } catch {
    console.log(`[dev-setup] Creating initial migration for ${db.name}...`);
    try {
      execSync("npx prisma migrate dev --name init", {
        cwd: root,
        stdio: "inherit",
        env,
      });
    } catch (err) {
      console.error(`\n[dev-setup] Failed to set up ${db.name} database.`);
      console.error(`  URL: ${db.url}`);
      console.error(`  Common fixes:`);
      console.error(`    1. Ensure PostgreSQL is running`);
      console.error(`    2. Update credentials in .env:`);
      console.error(
        `       DATABASE_URL_DEVELOPERS=postgresql://user:pass@host:5432/general_portal_dev`,
      );
      console.error(
        `       DATABASE_URL_STUCO=postgresql://user:pass@host:5432/general_portal_stuco`,
      );
      console.error(`    3. Create the databases manually:`);
      console.error(`       createdb general_portal_dev`);
      console.error(`       createdb general_portal_stuco`);
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
