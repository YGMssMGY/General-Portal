import { db } from "./db.js";

export async function writeAuditLog(
  workspaceId: string,
  data: {
    actorId?: string;
    actorName: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    resourceTitle?: string;
    metadata?: string;
    ipAddress?: string;
  },
) {
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
