import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { taskTimeEntries, tasks } from "@/db/schema";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    isUuid,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const createEntrySchema = z.object({
    taskId: z.string().uuid(),
    minutes: z.number().int().min(1).max(1440),
    note: z.string().trim().max(2000).nullable().optional(),
    date: z.string().optional(),
});
type CreateEntryInput = z.infer<typeof createEntrySchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const params = new URL(request.url).searchParams;
        const taskId = params.get("taskId");
        const userId = params.get("userId");
        const { limit, cursor } = parsePagination(params);
        if (taskId && !isUuid(taskId)) throw new ApiError("Invalid taskId", 400);
        if (userId && !isUuid(userId)) throw new ApiError("Invalid userId", 400);
        if (taskId) {
            const task = await t.db.query.tasks.findFirst({
                where: and(
                    eq(tasks.id, taskId),
                    eq(tasks.workspaceId, t.workspaceId),
                    isNull(tasks.deletedAt),
                ),
                columns: { id: true },
            });
            if (!task) throw new ApiError("Task not found", 404);
        }
        let targetUserId: string | null = t.userId;
        if (userId && userId !== t.userId) {
            if (!t.permissions.includes("manage_all_tasks")) throw new ApiError("Forbidden", 403);
            targetUserId = userId;
        } else if (params.get("all") === "true") {
            if (!t.permissions.includes("manage_all_tasks")) throw new ApiError("Forbidden", 403);
            targetUserId = null;
        }
        const conds = [];
        if (taskId) {
            const taskRows = await t.db.query.taskTimeEntries.findMany({
                where: eq(taskTimeEntries.taskId, taskId),
                columns: { taskId: true },
                limit: 1,
            });
            void taskRows;
            conds.push(eq(taskTimeEntries.taskId, taskId));
        }
        if (targetUserId) conds.push(eq(taskTimeEntries.userId, targetUserId));
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: taskTimeEntries.createdAt, value: at }],
                        taskTimeEntries.id,
                        vals[1],
                    ),
                );
            }
        }
        const rows = await t.db.query.taskTimeEntries.findMany({
            where: conds.length > 0 ? and(...conds) : undefined,
            orderBy: [desc(taskTimeEntries.createdAt), desc(taskTimeEntries.id)],
            limit: limit + 1,
            with: {
                user: { columns: { id: true, name: true, image: true } },
                task: { columns: { id: true, title: true, workspaceId: true, deletedAt: true } },
            },
        });
        const scoped = taskId
            ? rows.filter((r) => r.task.workspaceId === t.workspaceId && !r.task.deletedAt)
            : rows.filter((r) => r.task.workspaceId === t.workspaceId && !r.task.deletedAt);
        let nextCursor: string | null = null;
        if (scoped.length > limit) {
            const last = scoped.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const res = ok(scoped);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/tasks/time", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_time", module: "tasks" });
        const body = await parseBody<CreateEntryInput>(createEntrySchema as never, request);
        const task = await t.db.query.tasks.findFirst({
            where: and(
                eq(tasks.id, body.taskId),
                eq(tasks.workspaceId, t.workspaceId),
                isNull(tasks.deletedAt),
            ),
            columns: { id: true },
        });
        if (!task) throw new ApiError("Task not found", 404);
        let date = new Date();
        if (body.date) {
            date = new Date(body.date);
            if (Number.isNaN(date.getTime())) throw new ApiError("Invalid date", 400);
        }
        const [created] = await t.db
            .insert(taskTimeEntries)
            .values({
                id: randomUUID(),
                taskId: body.taskId,
                userId: t.userId,
                minutes: body.minutes,
                note: body.note ?? null,
                date,
            })
            .returning();
        return ok(created, 201);
    } catch (e) {
        return handleRouteError("POST /api/tasks/time", e);
    }
}
