import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..", "..");

dotenv.config({ path: resolve(root, ".env.local") });
dotenv.config({ path: resolve(root, ".env") });

export const env = {
  PORT: parseInt(process.env["BACKEND_PORT"] || "3001", 10),
  DATABASE_URL: process.env["DATABASE_URL"] || "postgresql://general_portal:general_portal@localhost:5432/general_portal",
  AUTH_SECRET: process.env["AUTH_SECRET"] || "dev-secret-change-in-production-abc123",
  AUTH_URL: process.env["AUTH_URL"] || "http://localhost:5173",
  DEV_AUTH_USERNAME: process.env["DEV_AUTH_USERNAME"] || "dev@generalportal.local",
  DEV_AUTH_PASSWORD: process.env["DEV_AUTH_PASSWORD"] || "devpass123",
  FRONTEND_ORIGIN: process.env["FRONTEND_ORIGIN"] || "http://localhost:5173",
  CLIENT_NAME: process.env["CLIENT_NAME"] || "developers",
  REDIS_HOST: process.env["REDIS_HOST"] || "localhost",
  REDIS_PORT: parseInt(process.env["REDIS_PORT"] || "6379", 10),
};
