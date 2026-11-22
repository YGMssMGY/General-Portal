import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Job, PgBoss } from "pg-boss";
import { getDb, type PortalDb } from "@/db/client";
import { linkItems, workspaces } from "@/db/schema";
import { listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";
import { fetchSafe } from "@/lib/ssrf";

export const LINK_HEALTH_QUEUE = "link-health";
export const LINK_HEALTH_CRON = "0 4 * * 0";

const CHECK_CONCURRENCY = 8;
type CheckStatus = "ok" | "broken" | "blocked";

export interface LinkHealthData {
    portal?: string;
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
    const result = await fetchSafe(target.toString(), { method: "HEAD", timeoutMs: 10_000 });
    if (result.blocked) return "blocked";
    return result.ok ? "ok" : "broken";
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
    const results: Array<{ id: string; status: CheckStatus }> = [];
    for (let i = 0; i < items.length; i += CHECK_CONCURRENCY) {
        const chunk = items.slice(i, i + CHECK_CONCURRENCY);
        const checked = await Promise.all(
            chunk.map(async (item) => {
                let status: CheckStatus;
                try {
                    status = await checkUrl(item.url);
                } catch (err) {
                    logger.warn({ err, portal: slug, url: item.url }, "link health check failed");
                    status = "broken";
                }
                return { id: item.id, status };
            }),
        );
        results.push(...checked);
    }
    const byStatus: Record<CheckStatus, string[]> = { ok: [], broken: [], blocked: [] };
    for (const r of results) byStatus[r.status].push(r.id);
    const okCount = byStatus.ok.length;
    const brokenCount = byStatus.broken.length;
    const blockedCount = byStatus.blocked.length;
    if (persist) {
        for (const status of ["ok", "broken", "blocked"] as const) {
            const ids = byStatus[status];
            if (ids.length === 0) continue;
            try {
                await db
                    .update(linkItems)
                    .set({ lastCheckedAt: new Date(), checkStatus: status })
                    .where(and(eq(linkItems.workspaceId, ws.id), inArray(linkItems.id, ids)));
            } catch (err) {
                logger.error(
                    { err, portal: slug, status, count: ids.length },
                    "link health update failed",
                );
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
