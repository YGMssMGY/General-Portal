export interface AuditLogData {
    actorId?: string;
    actorName: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceTitle?: string;
    metadata?: string;
    ipAddress?: string;
}

export async function writeAuditLog(db: any, workspaceId: string, data: AuditLogData) {
    return db.auditLog.create({
        data: {
            workspaceId,
            actorId: data.actorId ?? null,
            actorName: data.actorName,
            action: data.action,
            resourceType: data.resourceType,
            resourceId: data.resourceId ?? null,
            resourceTitle: data.resourceTitle ?? null,
            metadata: data.metadata ?? null,
            ipAddress: data.ipAddress ?? null,
        },
    });
}
