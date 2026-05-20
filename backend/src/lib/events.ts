import { PrismaClient } from "@prisma/client";

export async function emitEvent(
    db: PrismaClient,
    workspaceId: string,
    type: string,
    data: {
        actorName: string;
        action: string;
        resourceType: string;
        resourceTitle?: string;
        [key: string]: any;
    },
) {
    await db.activityLog.create({
        data: {
            workspaceId,
            actorName: data.actorName,
            action: data.action,
            resourceType: data.resourceType,
            resourceTitle: data.resourceTitle ?? null,
            occurredAt: new Date(),
        },
    });
}
