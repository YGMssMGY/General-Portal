import { lookup } from "node:dns/promises";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Job, PgBoss } from "pg-boss";
import { getDb, type PortalDb } from "@/db/client";
import { linkItems, workspaces } from "@/db/schema";
import { listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";

export const LINK_HEALTH_QUEUE = "link-health";
export const LINK_HEALTH_CRON = "0 4 * * 0";

export interface LinkHealthData {
    portal?: string;
}

function stripMapped(ip: string): string {
    return ip.startsWith("::ffff:") ? ip.slice("::ffff:".length) : ip;
}

function isBlockedIp(raw: string): boolean {
    const ip = stripMapped(raw);
    if (ip.includes(":")) {
        const lower = ip.toLowerCase();
        if (lower === "::1" || lower === "::") return true;
        if (/^fe[89ab]/i.test(lower)) return true;
        if (/^f[cd]/i.test(lower)) return true;
        if (/^ff/i.test(lower)) return true;
        return false;
    }
    const parts = ip.split(".");
    if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) return true;
    const [a, b] = parts.map(Number);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    return false;
}

async function columnsPersistable(db: PortalDb): Promise<boolean> {
    try {
        const res = (await db.execute(
            sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'link_items'`,
        )) as unknown as { rows?: Array<{ column_name?: string }> };
        const names = res.rows?.map((r) => r.column_name) ?? [];
        return names.includes("lastCheckedAt") && names.includes("checkStatus");
    } catch {
        return false;
    }
}

async function checkUrl(raw: string): Promise<"ok" | "broken" | "blocked"> {
    let target: URL;
    try {
        target = new URL(raw);
    } catch {
        return "broken";
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") return "blocked";
    try {
        const resolved = await lookup(target.hostname, { all: true });
        if (resolved.length === 0 || resolved.some((r) => isBlockedIp(r.address))) {
            return "blocked";
        }
    } catch {
        return "broken";
    }
    try {
        const res = await fetch(target.toString(), {
            method: "HEAD",
            signal: AbortSignal.timeout(10_000),
            headers: { "User-Agent": "General-Portal/1.0 LinkHealth" },
        });
        return res.ok ? "ok" : "broken";
    } catch {
        return "broken";
    }
}

async function linkHealthPortal(slug: string): Promise<void> {
    const db = getDb(slug);
    const ws = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
        columns: { id: true },
    });
    if (!ws) return;
    const persist = await columnsPersistable(db);
    const items = await db.query.linkItems.findMany({
        where: and(eq(linkItems.workspaceId, ws.id), isNull(linkItems.deletedAt)),
        orderBy: [asc(linkItems.createdAt)],
        limit: 200,
        columns: { id: true, url: true },
    });
    let okCount = 0;
    let brokenCount = 0;
    let blockedCount = 0;
    for (const item of items) {
        const status = await checkUrl(item.url);
        if (status === "ok") okCount += 1;
        else if (status === "broken") brokenCount += 1;
        else blockedCount += 1;
        if (persist) {
            try {
                await db.execute(
                    sql`UPDATE "link_items" SET "lastCheckedAt" = NOW(), "checkStatus" = ${status} WHERE "id" = ${item.id}`,
                );
            } catch (err) {
                logger.error({ err, portal: slug }, "link health update failed");
            }
        }
    }
    logger.info(
        { portal: slug, checked: items.length, okCount, brokenCount, blockedCount, persist },
        "link health complete",
    );
}

async function handle(jobs: Job<LinkHealthData>[]): Promise<void> {
    for (const job of jobs) {
        const only = job.data?.portal;
        const slugs = only ? [only] : listPortals().map((p) => p.slug);
        for (const slug of slugs) {
            try {
                await linkHealthPortal(slug);
            } catch (err) {
                logger.error({ err, portal: slug }, "link health failed");
            }
        }
    }
}

export async function registerLinkHealthJobs(boss: PgBoss): Promise<void> {
    await boss.createQueue(LINK_HEALTH_QUEUE);
    await boss.schedule(LINK_HEALTH_QUEUE, LINK_HEALTH_CRON);
    await boss.work<LinkHealthData>(LINK_HEALTH_QUEUE, handle);
}
