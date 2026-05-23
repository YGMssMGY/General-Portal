import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaClients: Map<string, PrismaClient> | undefined;
};

if (!globalForPrisma.prismaClients) {
  globalForPrisma.prismaClients = new Map();
}

const clientCache: Map<string, PrismaClient> = globalForPrisma.prismaClients;

const PORTAL_DATABASES: Record<string, string | undefined> = {
  developers: process.env.DATABASE_URL_DEVELOPERS,
  stuco: process.env.DATABASE_URL_STUCO,
};

export function getDbForPortal(portal: string): PrismaClient {
  const cached = clientCache.get(portal);
  if (cached) return cached;

  const url = PORTAL_DATABASES[portal];
  if (!url) {
    throw new Error(
      `Unknown portal: "${portal}". Ensure DATABASE_URL_${portal.toUpperCase()} is set in your environment.`
    );
  }

  const client = new PrismaClient({ datasourceUrl: url });
  clientCache.set(portal, client);
  return client;
}

export function getDbFromCookie(request: Request): PrismaClient {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => {
        const idx = c.indexOf("=");
        if (idx === -1) return [c, ""];
        return [c.slice(0, idx).trim(), c.slice(idx + 1).trim()];
      }),
  );

  const portal = cookies["portal"] ?? "developers";
  return getDbForPortal(portal);
}
