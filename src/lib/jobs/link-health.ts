import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Job, PgBoss } from "pg-boss";
import { getDb, type PortalDb } from "@/db/client";
import { linkItems, workspaces } from "@/db/schema";
import { listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";
import { fetchSafe } from "@/lib/ssrf";

export const LINK_HEALTH_QUEUE = "link-health";
export const LINK_HEALTH_CRON = "0 4 * * 0";

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
