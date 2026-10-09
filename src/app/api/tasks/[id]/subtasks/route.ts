import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { subTasks, tasks } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const createSubtaskSchema = z.object({ title: z.string().trim().min(1) });
type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;

async function scopedTask(t: Awaited<ReturnType<typeof requireTenant>>, taskId: string) {
    const task = await t.db.query.tasks.findFirst({
        where: and(
            eq(tasks.id, taskId),
            eq(tasks.workspaceId, t.workspaceId),
            isNull(tasks.deletedAt),
        ),
    });
    if (!task) throw new ApiError("Task not found", 404);
    return task;
}

function canManageTask(
    t: Awaited<ReturnType<typeof requireTenant>>,
    task: { createdById: string; assigneeId: string | null },
) {
    if (
        task.createdById !== t.userId &&
        task.assigneeId !== t.userId &&
        !t.permissions.includes("manage_all_tasks")
    ) {
        throw new ApiError("Forbidden", 403);
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const { id } = await params;
        requireUuid(id);
        await scopedTask(t, id);

        const rows = await t.db.query.subTasks.findMany({
            where: eq(subTasks.taskId, id),
            orderBy: [asc(subTasks.createdAt)],
        });

        const res = ok(rows);
        res.headers.set("X-Next-Cursor", "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/tasks/[id]/subtasks", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "create_task", module: "tasks" });
        const { id } = await params;
        requireUuid(id);
        await scopedTask(t, id);

        const body = await parseBody<CreateSubtaskInput>(createSubtaskSchema as never, request);
        const subtaskId = randomUUID();
        const [[subtask]] = await Promise.all([
            t.db
                .insert(subTasks)
                .values({ id: subtaskId, taskId: id, title: body.title })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create",
                entityType: "subtask",
                entityId: subtaskId,
                metadata: { taskId: id, title: body.title },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(subtask, 201);
    } catch (e) {
        return handleRouteError("POST /api/tasks/[id]/subtasks", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const { id } = await params;
        requireUuid(id);
        const task = await scopedTask(t, id);
        canManageTask(t, task);

        const subtaskId = requireUuid(new URL(request.url).searchParams.get("id"), "subtask id");
        const subtask = await t.db.query.subTasks.findFirst({
            where: and(eq(subTasks.id, subtaskId), eq(subTasks.taskId, id)),
        });
        if (!subtask) throw new ApiError("Subtask not found", 404);

        await Promise.all([
            t.db.delete(subTasks).where(eq(subTasks.id, subtaskId)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "subtask",
                entityId: subtaskId,
                metadata: { taskId: id },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/tasks/[id]/subtasks", e);
    }
}
