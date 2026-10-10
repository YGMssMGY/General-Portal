import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { taskComments, tasks } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";
import { notifyMentioned } from "@/lib/mentions";

const createCommentSchema = z.object({ content: z.string().trim().min(1) });
type CreateCommentInput = z.infer<typeof createCommentSchema>;

async function scopedTask(t: Awaited<ReturnType<typeof requireTenant>>, taskId: string) {
    const task = await t.db.query.tasks.findFirst({
        where: and(
            eq(tasks.id, taskId),
            eq(tasks.workspaceId, t.workspaceId),
            isNull(tasks.deletedAt),
        ),
        columns: { id: true, title: true },
    });
    if (!task) throw new ApiError("Task not found", 404);
    return task;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const { id } = await params;
        requireUuid(id);
        await scopedTask(t, id);

        const rows = await t.db.query.taskComments.findMany({
            where: eq(taskComments.taskId, id),
            orderBy: [asc(taskComments.createdAt)],
            with: { user: { columns: { id: true, name: true, email: true, image: true } } },
        });

        const res = ok(rows);
        res.headers.set("X-Next-Cursor", "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/tasks/[id]/comments", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "create_task", module: "tasks" });
        const { id } = await params;
        requireUuid(id);
        const task = await scopedTask(t, id);

        const body = await parseBody<CreateCommentInput>(createCommentSchema as never, request);
        const commentId = randomUUID();
        const [[comment]] = await Promise.all([
            t.db
                .insert(taskComments)
                .values({ id: commentId, taskId: id, userId: t.userId, content: body.content })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "commented",
                entityType: "task",
                entityId: id,
                metadata: { title: task.title },
                ipAddress: clientIp(request),
            }),
        ]);

        void notifyMentioned(t.db, {
            workspaceId: t.workspaceId,
            entityType: "task_comment",
            entityId: comment.id,
            text: body.content,
            senderId: t.userId,
            link: `/tasks?task=${id}`,
        }).catch(() => {});

        return ok(comment, 201);
    } catch (e) {
        return handleRouteError("POST /api/tasks/[id]/comments", e);
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
        await scopedTask(t, id);

        const commentId = requireUuid(new URL(request.url).searchParams.get("id"), "comment id");
        const comment = await t.db.query.taskComments.findFirst({
            where: and(eq(taskComments.id, commentId), eq(taskComments.taskId, id)),
        });
        if (!comment) throw new ApiError("Comment not found", 404);
        if (comment.userId !== t.userId && !t.permissions.includes("manage_all_tasks")) {
            throw new ApiError("Forbidden", 403);
        }

        await Promise.all([
            t.db.delete(taskComments).where(eq(taskComments.id, commentId)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "task_comment",
                entityId: commentId,
                metadata: { taskId: id },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/tasks/[id]/comments", e);
    }
}
