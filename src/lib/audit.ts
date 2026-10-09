import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { PortalDb } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { logger } from "@/lib/logger";

type AuditLogParams = {
    workspaceId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
};

function hashEntry(
    prevHash: string,
    entry: Omit<AuditLogParams, "workspaceId" | "userId"> & {
        workspaceId: string;
        createdAt: string;
    },
): string {
    return createHash("sha256")
        .update(JSON.stringify({ prev: prevHash, ...entry }))
        .digest("hex");
}

export async function writeAuditLog(params: AuditLogParams, db: PortalDb): Promise<void> {
    try {
        const latest = await db
            .select({ hash: auditLogs.hash })
            .from(auditLogs)
            .where(eq(auditLogs.workspaceId, params.workspaceId))
            .orderBy(desc(auditLogs.createdAt))
            .limit(1);
        const createdAt = new Date().toISOString();
        const prevHash = latest[0]?.hash ?? "GENESIS";
        const hash = hashEntry(prevHash, {
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            metadata: params.metadata ?? {},
            workspaceId: params.workspaceId,
            createdAt,
        });
        await db.insert(auditLogs).values({
            workspaceId: params.workspaceId,
            userId: params.userId ?? null,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId ?? null,
            metadata: params.metadata ?? {},
            ipAddress: params.ipAddress ?? null,
            prevHash,
            hash,
        });
    } catch (err) {
        logger.error({ err }, "Failed to write audit log");
    }
}

export async function verifyAuditChain(
    db: PortalDb,
    workspaceId: string,
): Promise<{ ok: boolean; checked: number; brokenAt?: string }> {
    const rows = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.workspaceId, workspaceId))
        .orderBy(auditLogs.createdAt);
    let prev = "GENESIS";
    for (const row of rows) {
        const expected = hashEntry(prev, {
            action: row.action,
            entityType: row.entityType,
            entityId: row.entityId ?? undefined,
            metadata: (row.metadata ?? {}) as Record<string, unknown>,
            workspaceId: row.workspaceId,
            createdAt: row.createdAt.toISOString(),
        });
        if (row.prevHash !== prev || row.hash !== expected) {
            return { ok: false, checked: rows.length, brokenAt: row.id };
        }
        prev = row.hash ?? prev;
    }
    return { ok: true, checked: rows.length };
}
