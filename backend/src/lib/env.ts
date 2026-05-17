export const env = {
  PORT: parseInt(process.env["BACKEND_PORT"] || "3001", 10),
  DATABASE_URL: process.env["DATABASE_URL"] || "file:./dev.db",
  AUTH_SECRET:
    process.env["AUTH_SECRET"] || "dev-secret-change-in-production-abc123",
  AUTH_URL: process.env["AUTH_URL"] || "http://localhost:5173",
  DEV_AUTH_PASSWORD: process.env["DEV_AUTH_PASSWORD"] || "devpass123",
  FRONTEND_ORIGIN: process.env["FRONTEND_ORIGIN"] || "http://localhost:5173",
  CLIENT_NAME: process.env["CLIENT_NAME"] || "developers",
  GITHUB_ID: process.env["GITHUB_ID"] || "",
  GITHUB_SECRET: process.env["GITHUB_SECRET"] || "",
  GOOGLE_ID: process.env["GOOGLE_ID"] || "",
  GOOGLE_SECRET: process.env["GOOGLE_SECRET"] || "",
  MICROSOFT_TENANT_ID: process.env["MICROSOFT_TENANT_ID"] || "common",
  MICROSOFT_CLIENT_ID: process.env["MICROSOFT_CLIENT_ID"] || "",
  MICROSOFT_CLIENT_SECRET: process.env["MICROSOFT_CLIENT_SECRET"] || "",
  NODE_ENV: process.env["NODE_ENV"] || "development",
};

export const IS_PRODUCTION =
  (process.env["NODE_ENV"] || "development") === "production";

/* ── DATABASE_URL vs schema provider validation ── */
const url = env.DATABASE_URL;
if (url.startsWith("postgresql://") || url.startsWith("postgres://")) {
  console.warn(
    '[env] DATABASE_URL points to PostgreSQL. Ensure schema.prisma uses `provider = "postgresql"`.',
  );
  console.warn(
    "  → Run `npm run db:use:prod` to swap schema for PostgreSQL before migrating.",
  );
} else if (!url.startsWith("file:")) {
  console.warn(
    "[env] DATABASE_URL has an unexpected format (expected `file:` for SQLite or `postgresql://` for PostgreSQL).",
  );
}
