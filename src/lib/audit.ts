import { createHash } from "node:crypto";
import { asc, desc, eq, sql } from "drizzle-orm";
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

function stable(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(stable);
    if (value !== null && typeof value === "object") {
        const source = value as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(source).sort()) out[key] = stable(source[key]);
        return out;
    }
    return value;
}

function hashEntry(
    prevHash: string,
    entry: Omit<AuditLogParams, "workspaceId" | "userId"> & {
        workspaceId: string;
        createdAt: string;
    },
): string {
    return createHash("sha256")
        .update(JSON.stringify(stable({ prev: prevHash, ...entry })))
        .digest("hex");
}

export async function writeAuditLog(params: AuditLogParams, db: PortalDb): Promise<void> {
    const lock = createHash("sha256").update(params.workspaceId).digest();
    const lockA = lock.readInt32BE(0);
    const lockB = lock.readInt32BE(4);
    try {
        await db.transaction(async (tx) => {
            await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockA}, ${lockB})`);
            const latest = await tx
                .select({ hash: auditLogs.hash, createdAt: auditLogs.createdAt })
                .from(auditLogs)
                .where(eq(auditLogs.workspaceId, params.workspaceId))
                .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
                .limit(1);
            const lastAt = latest[0]?.createdAt;
            const createdAt = new Date(
                Math.max(Date.now(), lastAt ? lastAt.getTime() + 1 : 0),
            ).toISOString();
            const prevHash = latest[0]?.hash ?? "GENESIS";
            const hash = hashEntry(prevHash, {
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                metadata: params.metadata ?? {},
                workspaceId: params.workspaceId,
                createdAt,
            });
            await tx.insert(auditLogs).values({
                workspaceId: params.workspaceId,
                userId: params.userId ?? null,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId ?? null,
                metadata: params.metadata ?? {},
                ipAddress: params.ipAddress ?? null,
                prevHash,
                hash,
                createdAt: new Date(createdAt),
            });
        });
    } catch (err) {
        logger.error({ err, workspaceId: params.workspaceId }, "audit write failed");
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
        .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id));
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
