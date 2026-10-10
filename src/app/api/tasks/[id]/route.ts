import { NextRequest } from "next/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { subTasks, taskComments, tasks } from "@/db/schema";
import {
    ApiError,
    clientIp,
    handleRouteError,
    isUuid,
    ok,
    parseBody,
    requireUuid,
} from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { validateCustomFields } from "@/lib/custom-fields";
import { parseRecurrenceRule } from "@/lib/recurrence";
import { requireTenant } from "@/lib/tenant";

const updateTaskSchema = z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    status: z.enum(["todo", "in_progress", "done"]).optional(),
    priority: z.number().int().optional(),
    dueDate: z.string().nullable().optional(),
    assigneeId: z.string().nullable().optional(),
    dependsOnId: z.string().uuid().nullable().optional(),
    recurrence: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const { id } = await params;
        requireUuid(id);

        const task = await t.db.query.tasks.findFirst({
            where: and(
                eq(tasks.id, id),
                eq(tasks.workspaceId, t.workspaceId),
                isNull(tasks.deletedAt),
            ),
            with: {
                createdBy: { columns: { id: true, name: true, email: true, image: true } },
                assignee: { columns: { id: true, name: true, email: true, image: true } },
                subtasks: { orderBy: [asc(subTasks.createdAt)] },
                comments: {
                    orderBy: [desc(taskComments.createdAt)],
                    limit: 10,
                    with: { user: { columns: { id: true, name: true, image: true } } },
                },
            },
        });
        if (!task) throw new ApiError("Task not found", 404);

        let blockedBy: { id: string; title: string; status: string } | null = null;
        if (task.dependsOnId) {
            const dep = await t.db.query.tasks.findFirst({
                where: and(
                    eq(tasks.id, task.dependsOnId),
                    eq(tasks.workspaceId, t.workspaceId),
                    isNull(tasks.deletedAt),
                ),
                columns: { id: true, title: true, status: true },
            });
            if (dep) blockedBy = { id: dep.id, title: dep.title, status: dep.status };
        }
        return ok({
            ...task,
            blockedBy,
            isBlocked: blockedBy ? blockedBy.status !== "done" : false,
        });
    } catch (e) {
        return handleRouteError("GET /api/tasks/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.tasks.findFirst({
            where: and(
                eq(tasks.id, id),
                eq(tasks.workspaceId, t.workspaceId),
                isNull(tasks.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Task not found", 404);
        if (
            existing.createdById !== t.userId &&
            existing.assigneeId !== t.userId &&
            !t.permissions.includes("manage_all_tasks")
        ) {
            throw new ApiError("Forbidden", 403);
        }

        const body = await parseBody<UpdateTaskInput>(updateTaskSchema as never, request);
        if (!Object.values(body).some((v) => v !== undefined)) {
            throw new ApiError("No fields to update", 400);
        }
        if (body.metadata !== undefined) {
            const fieldErrors = await validateCustomFields(
                t.db,
                t.workspaceId,
                "task",
                body.metadata,
            );
            if (fieldErrors.length > 0) throw new ApiError(fieldErrors.join("; "), 400);
        }

        const set: Partial<typeof tasks.$inferInsert> & { updatedAt: Date } = {
            updatedAt: new Date(),
        };
        if (body.metadata !== undefined) set.metadata = body.metadata as Record<string, unknown>;
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description;
        if (body.status !== undefined) set.status = body.status;
        if (body.priority !== undefined) set.priority = body.priority;
        if (body.dueDate !== undefined) {
            if (body.dueDate === null || body.dueDate === "") {
                set.dueDate = null;
            } else {
                const d = new Date(body.dueDate);
                if (Number.isNaN(d.getTime())) throw new ApiError("Invalid dueDate", 400);
                set.dueDate = d;
            }
        }
        if (body.assigneeId !== undefined) {
            if (body.assigneeId === null || body.assigneeId === "") {
                set.assigneeId = null;
            } else {
                if (!isUuid(body.assigneeId)) throw new ApiError("Invalid assigneeId", 400);
                set.assigneeId = body.assigneeId;
            }
        }
        if (body.recurrence !== undefined) {
            if (body.recurrence === null || body.recurrence === "") {
                set.recurrence = null;
            } else {
                try {
                    parseRecurrenceRule(body.recurrence);
                } catch {
                    throw new ApiError("Invalid recurrence rule", 400);
                }
                set.recurrence = body.recurrence;
            }
        }
        if (body.dependsOnId !== undefined) {
            if (body.dependsOnId === null) {
                set.dependsOnId = null;
            } else {
                if (body.dependsOnId === id)
                    throw new ApiError("A task cannot depend on itself", 400);
                const target = await t.db.query.tasks.findFirst({
                    where: and(
                        eq(tasks.id, body.dependsOnId),
                        eq(tasks.workspaceId, t.workspaceId),
                        isNull(tasks.deletedAt),
                    ),
                    columns: { id: true, dependsOnId: true },
                });
                if (!target) throw new ApiError("Dependency task not found", 404);
                let cursor: string | null = target.dependsOnId ?? null;
                for (let i = 0; i < 50; i++) {
                    if (!cursor) break;
                    if (cursor === id)
                        throw new ApiError("This dependency would create a cycle", 400);
                    const next = await t.db.query.tasks.findFirst({
                        where: and(
                            eq(tasks.id, cursor),
                            eq(tasks.workspaceId, t.workspaceId),
                            isNull(tasks.deletedAt),
                        ),
                        columns: { id: true, dependsOnId: true },
                    });
                    if (!next) break;
                    cursor = next.dependsOnId ?? null;
                }
                if (cursor === id) throw new ApiError("This dependency would create a cycle", 400);
                set.dependsOnId = body.dependsOnId;
            }
        }

        const [[updated]] = await Promise.all([
            t.db.update(tasks).set(set).where(eq(tasks.id, id)).returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "task",
                entityId: id,
                metadata: { changes: Object.keys(set).filter((k) => k !== "updatedAt") },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/tasks/[id]", e);
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

        const existing = await t.db.query.tasks.findFirst({
            where: and(
                eq(tasks.id, id),
                eq(tasks.workspaceId, t.workspaceId),
                isNull(tasks.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Task not found", 404);
        if (
            existing.createdById !== t.userId &&
            existing.assigneeId !== t.userId &&
            !t.permissions.includes("manage_all_tasks")
        ) {
            throw new ApiError("Forbidden", 403);
        }

        const permanent = new URL(request.url).searchParams.get("permanent") === "true";
        const sideEffect = emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "delete",
            entityType: "task",
            entityId: id,
            metadata: { title: existing.title },
            ipAddress: clientIp(request),
        });
        if (permanent && t.roleName === "admin") {
            await Promise.all([t.db.delete(tasks).where(eq(tasks.id, id)), sideEffect]);
        } else {
            await Promise.all([
                t.db
                    .update(tasks)
                    .set({ deletedAt: new Date(), updatedAt: new Date() })
                    .where(eq(tasks.id, id)),
                sideEffect,
            ]);
        }

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/tasks/[id]", e);
    }
}
