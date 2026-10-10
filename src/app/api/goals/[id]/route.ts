import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { goals, users } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";
import { goalProgress } from "@/app/api/goals/route";

const updateSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullish(),
    status: z.enum(["active", "completed", "archived"]).optional(),
    ownerId: z.string().uuid().nullish(),
    dueDate: z.string().nullish(),
});

const scoped = (id: string, workspaceId: string) =>
    and(eq(goals.id, id), eq(goals.workspaceId, workspaceId), isNull(goals.deletedAt));

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const goal = await t.db.query.goals.findFirst({
            where: scoped(id, t.workspaceId),
            with: {
                keyResults: { orderBy: (o, { asc }) => [asc(o.position)] },
                owner: { columns: { id: true, name: true } },
            },
        });
        if (!goal) throw new ApiError("Goal not found", 404);
        return ok({ ...goal, progress: goalProgress(goal.keyResults) });
    } catch (e) {
        return handleRouteError("GET /api/goals/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_goals", module: "members" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.goals.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Goal not found", 404);
        const data = await parseBody(updateSchema as never, request);
        const body = data as z.infer<typeof updateSchema>;
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);
        if (body.ownerId) {
            const owner = await t.db.query.users.findFirst({
                where: eq(users.id, body.ownerId),
                columns: { id: true },
            });
            if (!owner) throw new ApiError("Owner not found", 404);
        }
        const set: Partial<typeof goals.$inferInsert> = { updatedAt: new Date() };
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description ?? null;
        if (body.status !== undefined) set.status = body.status;
        if (body.ownerId !== undefined) set.ownerId = body.ownerId ?? null;
        if (body.dueDate !== undefined) {
            if (body.dueDate === null) {
                set.dueDate = null;
            } else {
                const d = new Date(body.dueDate);
                if (Number.isNaN(d.getTime())) throw new ApiError("Invalid dueDate", 400);
                set.dueDate = d;
            }
        }
        const updated = await t.db
            .update(goals)
            .set(set)
            .where(scoped(id, t.workspaceId))
            .returning();
        const goal = updated[0];
        if (!goal) throw new ApiError("Goal not found", 404);
        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "goal",
                entityId: id,
                metadata: { changes: body },
                ipAddress: clientIp(request),
            },
            t.db,
        );
        return ok(goal);
    } catch (e) {
        return handleRouteError("PUT /api/goals/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { permission: "manage_goals", module: "members" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.goals.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Goal not found", 404);
        await t.db.update(goals).set({ deletedAt: new Date() }).where(scoped(id, t.workspaceId));
        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "goal",
                entityId: id,
                metadata: { title: existing.title },
                ipAddress: clientIp(request),
            },
            t.db,
        );
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/goals/[id]", e);
    }
}
