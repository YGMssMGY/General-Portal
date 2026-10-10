import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { meetingMinutes, tasks } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const actionItemSchema = z.object({
    title: z.string().trim().min(1),
    assigneeId: z.string().uuid().nullable().optional(),
    dueDate: z.string().nullable().optional(),
});
type ActionItemInput = z.infer<typeof actionItemSchema>;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_minutes",
            module: "meetings",
        });
        const { id } = await params;
        requireUuid(id);

        const minute = await t.db.query.meetingMinutes.findFirst({
            where: and(eq(meetingMinutes.id, id), eq(meetingMinutes.workspaceId, t.workspaceId)),
        });
        if (!minute) throw new ApiError("Minute not found", 404);

        const body = await parseBody<ActionItemInput>(actionItemSchema as never, request);

        let dueDate: Date | null = null;
        if (body.dueDate) {
            dueDate = new Date(body.dueDate);
            if (Number.isNaN(dueDate.getTime())) throw new ApiError("Invalid dueDate", 400);
        }

        const taskId = randomUUID();
        const [[task]] = await Promise.all([
            t.db
                .insert(tasks)
                .values({
                    id: taskId,
                    workspaceId: t.workspaceId,
                    title: body.title,
                    assigneeId: body.assigneeId ?? null,
                    dueDate,
                    meetingId: minute.meetingId,
                    createdById: t.userId,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create",
                entityType: "task",
                entityId: taskId,
                metadata: { minuteId: id, meetingId: minute.meetingId, title: body.title },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(task, 201);
    } catch (e) {
        return handleRouteError("POST /api/minutes/[id]/action-items", e);
    }
}
