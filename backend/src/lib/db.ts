import { PrismaClient } from "@prisma/client";

const globalForDb = globalThis as unknown as {
  __prisma_clients: Map<string, PrismaClient> | undefined;
};

const PORTAL_MAP: Record<string, string> = {
  developers: "DATABASE_URL_DEVELOPERS",
  stuco: "DATABASE_URL_STUCO",
};

function getDbUrl(portal: string): string {
  const envKey = PORTAL_MAP[portal];
  if (!envKey) throw new Error(`Invalid portal: ${portal}`);

  const url = process.env[envKey];
  if (!url)
    throw new Error(
      `${envKey} is not set — cannot connect to ${portal} database`,
    );
  return url;
}

export function getDb(portal: string): PrismaClient {
  if (!globalForDb.__prisma_clients) {
    globalForDb.__prisma_clients = new Map();
  }

  let client = globalForDb.__prisma_clients.get(portal);
  if (!client) {
    client = new PrismaClient({
      datasources: { db: { url: getDbUrl(portal) } },
      log:
        process.env["NODE_ENV"] === "production"
          ? ["error"]
          : ["warn", "error"],
    });
    globalForDb.__prisma_clients.set(portal, client);
  }
  return client;
}

export function getDbFromContext(c: any): PrismaClient {
  const portal = c.get("portal") || "developers";
  return getDb(portal);
}
