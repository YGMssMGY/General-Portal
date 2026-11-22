import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { config } from "@/config";
import { listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";

export type PortalDb = NodePgDatabase<typeof schema>;

const pools = new Map<string, Pool>();
const dbs = new Map<string, PortalDb>();

const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export function normalizeSlug(raw: string): string | null {
    const slug = raw.trim().toLowerCase();
    return SLUG_RE.test(slug) ? slug : null;
}

export function isSingleDbMode(): boolean {
    return config.singleDbModeEnabled;
}

function configuredSlugs(): string[] {
    return listPortals()
        .map((p) => normalizeSlug(p.slug))
        .filter((s): s is string => s !== null);
}

export function portalDbUrl(slug: string): string | undefined {
    const clean = normalizeSlug(slug);
    if (!clean) return undefined;
    if (isSingleDbMode() && configuredSlugs().includes(clean)) return config.singleDbUrl;
    return process.env[`DATABASE_URL_${clean.toUpperCase().replace(/-/g, "_")}`];
}

export function listPortalSlugs(): string[] {
    const slugs = new Set<string>();
    for (const key of Object.keys(process.env)) {
        if (key === "DATABASE_URL_SINGLE") continue;
        const m = /^DATABASE_URL_([A-Z0-9_]+)$/.exec(key);
        if (!m || !process.env[key]) continue;
        const slug = m[1].toLowerCase().replace(/_/g, "-");
        const clean = normalizeSlug(slug);
        if (clean) slugs.add(clean);
    }
    if (isSingleDbMode()) for (const slug of configuredSlugs()) slugs.add(slug);
    return [...slugs].sort();
}

export function isKnownPortal(slug: string): boolean {
    const clean = normalizeSlug(slug);
    if (!clean) return false;
    if (isSingleDbMode()) return configuredSlugs().includes(clean);
    return portalDbUrl(clean) !== undefined;
}

function buildPool(url: string): Pool {
    const separator = url.includes("?") ? "&" : "?";
    return new Pool({
        connectionString: `${url}${separator}statement_timeout=15000`,
        max: config.poolMax,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
    });
}

export function getPool(slug: string): Pool {
    const clean = normalizeSlug(slug);
    if (!clean) throw new Error(`Invalid portal slug: ${slug}`);
    const cached = pools.get(clean);
    if (cached) return cached;
    const url = portalDbUrl(clean);
    if (!url) throw new Error(`Unknown portal: "${clean}"`);
    const pool = buildPool(url);
    pool.on("error", (e) => logger.error({ portal: clean, err: e }, "pg pool error"));
    pools.set(clean, pool);
    return pool;
}

export function getDb(slug: string): PortalDb {
    const clean = normalizeSlug(slug);
    if (!clean) throw new Error(`Invalid portal slug: ${slug}`);
    const cached = dbs.get(clean);
    if (cached) return cached;
    const db = drizzle(getPool(clean), { schema });
    dbs.set(clean, db);
    return db;
}

export async function closeAllPools(): Promise<void> {
    await Promise.allSettled([...pools.values()].map((p) => p.end()));
    pools.clear();
    dbs.clear();
}
