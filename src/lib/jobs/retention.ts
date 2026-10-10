import { and, eq, inArray, lt, type SQL } from "drizzle-orm";
import type { Job, PgBoss } from "pg-boss";
import { getDb, type PortalDb } from "@/db/client";
import { activityFeed, auditLogs, notifications, workspaces } from "@/db/schema";
import { limitsFor, listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";

export const RETENTION_QUEUE = "retention";
export const RETENTION_CRON = "0 3 * * *";

export interface RetentionData {
    portal?: string;
}

type PurgeTable = typeof auditLogs | typeof activityFeed | typeof notifications;

async function purgeOlderThan(
    db: PortalDb,
    table: PurgeTable,
    workspaceId: string,
    cutoff: Date,
    extra?: SQL,
): Promise<number> {
    let total = 0;
    for (;;) {
        const conds = [eq(table.workspaceId, workspaceId), lt(table.createdAt, cutoff)];
        if (extra) conds.push(extra);
        const batch = await db
            .select({ id: table.id })
            .from(table)
            .where(and(...conds))
            .limit(1000);
        if (batch.length === 0) break;
        await db.delete(table).where(
            inArray(
                table.id,
                batch.map((b) => b.id),
            ),
        );
        total += batch.length;
        if (batch.length < 1000) break;
    }
    return total;
}

async function retentionPortal(slug: string): Promise<void> {
    const db = getDb(slug);
    const ws = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
        columns: { id: true },
    });
    if (!ws) return;
    const retentionDays = limitsFor(slug).auditRetentionDays ?? 365;
    const now = Date.now();
    const [audit, feed, notif] = await Promise.all([
        purgeOlderThan(db, auditLogs, ws.id, new Date(now - retentionDays * 24 * 3600 * 1000)),
        purgeOlderThan(db, activityFeed, ws.id, new Date(now - 180 * 24 * 3600 * 1000)),
        purgeOlderThan(
            db,
            notifications,
            ws.id,
            new Date(now - 90 * 24 * 3600 * 1000),
            eq(notifications.read, true),
        ),
    ]);
    logger.info({ portal: slug, audit, feed, notif }, "retention purge complete");
}

async function handle(jobs: Job<RetentionData>[]): Promise<void> {
    for (const job of jobs) {
        const only = job.data?.portal;
        const slugs = only ? [only] : listPortals().map((p) => p.slug);
        for (const slug of slugs) {
            try {
                await retentionPortal(slug);
            } catch (err) {
                logger.error({ err, portal: slug }, "retention failed");
            }
        }
    }
}

export async function registerRetentionJobs(boss: PgBoss): Promise<void> {
    await boss.createQueue(RETENTION_QUEUE);
    await boss.schedule(RETENTION_QUEUE, RETENTION_CRON);
    await boss.work<RetentionData>(RETENTION_QUEUE, handle);
}
