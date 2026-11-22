import { eq } from "drizzle-orm";
import type { PortalDb } from "@/db/client";
import { activityFeed, workspaces } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { logger } from "@/lib/logger";

const slugCache = new Map<string, string>();

async function workspaceSlug(db: PortalDb, workspaceId: string): Promise<string | null> {
    const hit = slugCache.get(workspaceId);
    if (hit) return hit;
    try {
        const rows = await db
            .select({ slug: workspaces.slug })
            .from(workspaces)
            .where(eq(workspaces.id, workspaceId))
            .limit(1);
        if (!rows[0]) return null;
        slugCache.set(workspaceId, rows[0].slug);
        return rows[0].slug;
    } catch {
        return null;
    }
}

export async function emitSideEffects(
    db: PortalDb,
    params: {
        workspaceId: string;
        userId: string;
        action: string;
        entityType: string;
        entityId?: string;
        metadata?: Record<string, unknown>;
        ipAddress?: string | null;
    },
): Promise<void> {
    const { workspaceId, userId, action, entityType, entityId, metadata, ipAddress } = params;
    const results = await Promise.allSettled([
        db.insert(activityFeed).values({
            workspaceId,
            userId,
            action,
            entityType,
            entityId: entityId ?? null,
            metadata: metadata ?? {},
        }),
        writeAuditLog(
            {
                workspaceId,
                userId,
                action,
                entityType,
                entityId,
                metadata,
                ipAddress: ipAddress ?? undefined,
            },
            db,
        ),
    ]);
    for (const result of results) {
        if (result.status === "rejected") {
            logger.error({ err: result.reason, action }, "side effect failed");
        }
    }
    workspaceSlug(db, workspaceId)
        .then((slug) => {
            if (!slug) return undefined;
            return import("@/lib/jobs/webhooks").then(({ publishWebhook }) =>
                publishWebhook(slug, workspaceId, `${entityType}.${action}`, {
                    entityType,
                    entityId: entityId ?? null,
                    action,
                    metadata: metadata ?? {},
                }),
            );
        })
        .catch((err) => logger.debug({ err }, "webhook fan-out skipped"));
}
