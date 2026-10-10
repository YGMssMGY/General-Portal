import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { workflows } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const stageSchema = z.object({
    name: z.string().trim().min(1),
    approverRoleId: z.string().uuid().optional(),
    approverId: z.string().uuid().optional(),
    slaHours: z.number().positive().optional(),
    escalationRoleId: z.string().uuid().optional(),
});

const updateWorkflowSchema = z.object({
    entityType: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    stages: z.array(stageSchema).min(1).optional(),
    isActive: z.boolean().optional(),
});
type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;

function scoped(id: string, workspaceId: string) {
    return and(eq(workflows.id, id), eq(workflows.workspaceId, workspaceId));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { id } = await params;
        requireUuid(id);

        const row = await t.db.query.workflows.findFirst({ where: scoped(id, t.workspaceId) });
        if (!row) throw new ApiError("Workflow not found", 404);
        return ok(row);
    } catch (e) {
        return handleRouteError("GET /api/workflows/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_workflows",
            module: "members",
        });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.workflows.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Workflow not found", 404);

        const body = await parseBody<UpdateWorkflowInput>(updateWorkflowSchema as never, request);
        const set: Partial<typeof workflows.$inferInsert> = {};
        if (body.entityType !== undefined) set.entityType = body.entityType;
        if (body.name !== undefined) set.name = body.name;
        if (body.stages !== undefined) set.stages = body.stages;
        if (body.isActive !== undefined) set.isActive = body.isActive;
        if (Object.keys(set).length === 0) throw new ApiError("No fields to update", 400);

        const [[updated]] = await Promise.all([
            t.db.update(workflows).set(set).where(eq(workflows.id, id)).returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "workflow",
                entityId: id,
                metadata: { changes: Object.keys(set) },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/workflows/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_workflows",
            module: "members",
        });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.workflows.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Workflow not found", 404);

        const [[deleted]] = await Promise.all([
            t.db.delete(workflows).where(eq(workflows.id, id)).returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "workflow",
                entityId: id,
                metadata: { name: existing.name },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(deleted ?? { deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/workflows/[id]", e);
    }
}
