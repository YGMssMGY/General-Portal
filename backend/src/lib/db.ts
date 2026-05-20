import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const globalForDb = globalThis as unknown as {
	__prisma_clients: Map<string, PrismaClient> | undefined;
};

const FALLBACK_URLS: Record<string, string> = {
	developers: "postgresql://localhost:5432/general_portal_dev",
	stuco: "postgresql://localhost:5432/general_portal_stuco",
};

function addConnectionLimit(url: string): string {
	const separator = url.includes("?") ? "&" : "?";
	return `${url}${separator}connection_limit=5`;
}

function getDbUrl(portal: string): string {
	const raw =
		portal === "developers"
			? env.DATABASE_URL_DEVELOPERS
			: portal === "stuco"
				? env.DATABASE_URL_STUCO
				: FALLBACK_URLS[portal] || FALLBACK_URLS.developers;
	return addConnectionLimit(raw);
}

export async function getDb(portal: string): Promise<PrismaClient> {
	if (!globalForDb.__prisma_clients) {
		globalForDb.__prisma_clients = new Map();
	}

	let client = globalForDb.__prisma_clients.get(portal);
	if (!client) {
		const url = getDbUrl(portal);
		const delays = [1000, 2000, 4000];
		let lastError: Error | undefined;
		for (let attempt = 0; attempt <= delays.length; attempt++) {
			try {
				client = new PrismaClient({
					datasources: { db: { url } },
					log: process.env["NODE_ENV"] === "production" ? ["error"] : ["warn", "error"],
				});
				break;
			} catch (e: any) {
				lastError = e;
				if (attempt < delays.length) {
					console.warn(
						`[db] PrismaClient creation failed (attempt ${attempt + 1}), retrying in ${delays[attempt]}ms`,
					);
					await new Promise((r) => setTimeout(r, delays[attempt]));
				}
			}
		}
		if (!client) {
			throw lastError || new Error("Failed to create PrismaClient after multiple attempts");
		}
		globalForDb.__prisma_clients.set(portal, client);
	}
	return client;
}

export async function getDbFromContext(c: any): Promise<PrismaClient> {
	const portal = c.get("portal") || "developers";
	return await getDb(portal);
}
