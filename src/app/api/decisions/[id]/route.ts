import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { decisions } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    summary: z.string().trim().min(1).max(5000).optional(),
    entityType: z.string().trim().max(50).nullish(),
    entityId: z.string().trim().max(100).nullish(),
    decidedAt: z.string().optional(),
});

const scoped = (id: string, workspaceId: string) =>
    and(eq(decisions.id, id), eq(decisions.workspaceId, workspaceId));

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_decisions",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.decisions.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Decision not found", 404);
        const data = await parseBody(updateSchema as never, request);
        const body = data as z.infer<typeof updateSchema>;
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);
        const set: Partial<typeof decisions.$inferInsert> = {};
        if (body.title !== undefined) set.title = body.title;
        if (body.summary !== undefined) set.summary = body.summary;
        if (body.entityType !== undefined) set.entityType = body.entityType ?? null;
        if (body.entityId !== undefined) set.entityId = body.entityId ?? null;
        if (body.decidedAt !== undefined) {
            const d = new Date(body.decidedAt);
            if (Number.isNaN(d.getTime())) throw new ApiError("Invalid decidedAt", 400);
            set.decidedAt = d;
        }
        const updated = await t.db
            .update(decisions)
            .set(set)
            .where(scoped(id, t.workspaceId))
            .returning();
        const decision = updated[0];
        if (!decision) throw new ApiError("Decision not found", 404);
        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "decision",
                entityId: id,
                metadata: { changes: body },
                ipAddress: clientIp(request),
            },
            t.db,
        );
        return ok(decision);
    } catch (e) {
        return handleRouteError("PUT /api/decisions/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_decisions",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.decisions.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Decision not found", 404);
        await t.db.delete(decisions).where(scoped(id, t.workspaceId));
        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "decision",
                entityId: id,
                metadata: { title: existing.title },
                ipAddress: clientIp(request),
            },
            t.db,
        );
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/decisions/[id]", e);
    }
}
