import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

const nodeEnv = process.env["NODE_ENV"] || "development";
const isProduction = nodeEnv === "production";

function requireEnv(key: string): string {
    const value = process.env[key];
    if (isProduction && !value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || "";
}

export const env = {
    PORT: parseInt(process.env["BACKEND_PORT"] || "30001", 10),
    PROD_PORT: parseInt(process.env["PROD_PORT"] || "3000", 10),
    DATABASE_URL_DEVELOPERS:
        process.env["DATABASE_URL_DEVELOPERS"] || "postgresql://localhost:5432/general_portal_dev",
    DATABASE_URL_STUCO:
        process.env["DATABASE_URL_STUCO"] || "postgresql://localhost:5432/general_portal_stuco",
    AUTH_SECRET: requireEnv("AUTH_SECRET") || "dev-secret-change-in-production-abc123",
    AUTH_URL: process.env["AUTH_URL"] || "http://localhost:3000",
    MICROSOFT_TENANT_ID: process.env["MICROSOFT_TENANT_ID"] || "common",
    MICROSOFT_CLIENT_ID: process.env["MICROSOFT_CLIENT_ID"] || "",
    MICROSOFT_CLIENT_SECRET: process.env["MICROSOFT_CLIENT_SECRET"] || "",
    NODE_ENV: nodeEnv,
    API_KEY: process.env["API_KEY"] || "",
    FRONTEND_ORIGIN: process.env["FRONTEND_ORIGIN"] || "http://localhost:3000",
    SENTRY_DSN: process.env["SENTRY_DSN"] || "",
    RATE_LIMIT_MAX: parseInt(process.env["RATE_LIMIT_MAX"] || "100", 10),
    UPLOADS_DIR: process.env["UPLOADS_DIR"] || "./uploads",
};

export const IS_PRODUCTION = isProduction;
