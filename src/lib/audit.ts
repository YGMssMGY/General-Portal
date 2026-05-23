import type { Prisma, PrismaClient } from "@prisma/client";

type AuditLogParams = {
  workspaceId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
};

export async function writeAuditLog(
  params: AuditLogParams,
  db: PrismaClient,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
