import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, asc, desc, eq, ilike, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { subTasks, taskComments, tasks } from "@/db/schema";
import {
    ApiError,
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { validateCustomFields } from "@/lib/custom-fields";
import { parseRecurrenceRule } from "@/lib/recurrence";
import { requireTenant } from "@/lib/tenant";

const createTaskSchema = z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
    priority: z.number().int().optional(),
    dueDate: z.string().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    recurrence: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
type CreateTaskInput = z.infer<typeof createTaskSchema>;

function escapeLike(s: string): string {
    return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "tasks" });
        const searchParams = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(searchParams);
        const status = searchParams.get("status");
        const assigneeId = searchParams.get("assigneeId");
        const priorityRaw = searchParams.get("priority");
        const q = searchParams.get("q")?.trim() || null;

        const conds = [eq(tasks.workspaceId, t.workspaceId), isNull(tasks.deletedAt)];
        if (status === "todo" || status === "in_progress" || status === "done") {
            conds.push(eq(tasks.status, status));
        }
        if (assigneeId) conds.push(eq(tasks.assigneeId, assigneeId));
        if (priorityRaw !== null && priorityRaw !== "") {
            const p = Number.parseInt(priorityRaw, 10);
            if (Number.isInteger(p)) conds.push(eq(tasks.priority, p));
        }
        if (q) conds.push(ilike(tasks.title, `%${escapeLike(q)}%`));

        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length === 3 &&
            typeof vals[0] === "number" &&
            typeof vals[1] === "string" &&
            typeof vals[2] === "string"
        ) {
            const at = new Date(vals[1]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [
                            { column: tasks.priority, value: vals[0] },
                            { column: tasks.createdAt, value: at },
                        ],
                        tasks.id,
                        vals[2],
                    ),
                );
            }
        }

        const rows = await t.db.query.tasks.findMany({
            where: and(...conds),
            orderBy: [desc(tasks.priority), desc(tasks.createdAt), desc(tasks.id)],
            limit: limit + 1,
            with: {
                createdBy: { columns: { id: true, name: true, email: true, image: true } },
                assignee: { columns: { id: true, name: true, email: true, image: true } },
                subtasks: { orderBy: [asc(subTasks.createdAt)] },
            },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.priority, last.createdAt.toISOString(), last.id]);
        }

        const ids = rows.map((r) => r.id);
        const grouped = new Map<string, object[]>();
        if (ids.length > 0) {
            const recent = await t.db.query.taskComments.findMany({
                where: inArray(taskComments.taskId, ids),
                orderBy: [desc(taskComments.createdAt)],
                limit: ids.length * 10,
                with: { user: { columns: { id: true, name: true, image: true } } },
            });
            for (const c of recent) {
                const list = grouped.get(c.taskId) ?? [];
                if (list.length < 10) {
                    list.push(c);
                    grouped.set(c.taskId, list);
                }
            }
        }
        const items = rows.map((r) => ({ ...r, comments: grouped.get(r.id) ?? [] }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/tasks", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "create_task", module: "tasks" });
        const body = await parseBody<CreateTaskInput>(createTaskSchema as never, request);
        const fieldErrors = await validateCustomFields(t.db, t.workspaceId, "task", body.metadata);
        if (fieldErrors.length > 0) throw new ApiError(fieldErrors.join("; "), 400);

        let dueDate: Date | null = null;
        if (body.dueDate) {
            dueDate = new Date(body.dueDate);
            if (Number.isNaN(dueDate.getTime())) throw new ApiError("Invalid dueDate", 400);
        }
        let recurrence: string | null = null;
        if (body.recurrence) {
            try {
                parseRecurrenceRule(body.recurrence);
            } catch {
                throw new ApiError("Invalid recurrence rule", 400);
            }
            recurrence = body.recurrence;
        }

        const id = randomUUID();
        const [[created]] = await Promise.all([
            t.db
                .insert(tasks)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    title: body.title,
                    description: body.description ?? null,
                    priority: body.priority ?? 0,
                    dueDate,
                    assigneeId: body.assigneeId ?? null,
                    recurrence,
                    metadata: (body.metadata ?? {}) as Record<string, unknown>,
                    createdById: t.userId,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create",
                entityType: "task",
                entityId: id,
                metadata: { title: body.title },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(created, 201);
    } catch (e) {
        return handleRouteError("POST /api/tasks", e);
    }
}
