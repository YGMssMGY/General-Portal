import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const globalForDb = globalThis as unknown as {
	__prisma_clients: Map<string, PrismaClient> | undefined;
};

const FALLBACK_URLS: Record<string, string> = {
	developers: "postgresql://localhost:5432/general_portal_dev",
	stuco: "postgresql://localhost:5432/general_portal_stuco",
};

function getDbUrl(portal: string): string {
	if (portal === "developers") return env.DATABASE_URL_DEVELOPERS;
	if (portal === "stuco") return env.DATABASE_URL_STUCO;
	return FALLBACK_URLS[portal] || FALLBACK_URLS.developers;
}

export function getDb(portal: string): PrismaClient {
	if (!globalForDb.__prisma_clients) {
		globalForDb.__prisma_clients = new Map();
	}

	let client = globalForDb.__prisma_clients.get(portal);
	if (!client) {
		client = new PrismaClient({
			datasources: { db: { url: getDbUrl(portal) } },
			log: process.env["NODE_ENV"] === "production" ? ["error"] : ["warn", "error"],
		});
		globalForDb.__prisma_clients.set(portal, client);
	}
	return client;
}

export function getDbFromContext(c: any): PrismaClient {
	const portal = c.get("portal") || "developers";
	return getDb(portal);
}
