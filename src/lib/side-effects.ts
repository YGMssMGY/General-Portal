import type { PortalDb } from "@/db/client";
import { activityFeed } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";

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
    await Promise.all([
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
}
