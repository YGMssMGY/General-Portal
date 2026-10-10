import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { meetingMinutes } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const updateMinuteSchema = z.object({ content: z.string().trim().min(1) });
type UpdateMinuteInput = z.infer<typeof updateMinuteSchema>;

function scoped(id: string, workspaceId: string) {
    return and(eq(meetingMinutes.id, id), eq(meetingMinutes.workspaceId, workspaceId));
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "meetings" });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.meetingMinutes.findFirst({
            where: scoped(id, t.workspaceId),
        });
        if (!existing) throw new ApiError("Minute not found", 404);
        if (existing.createdById !== t.userId && !t.permissions.includes("manage_minutes")) {
            throw new ApiError("Forbidden", 403);
        }

        const body = await parseBody<UpdateMinuteInput>(updateMinuteSchema as never, request);

        const [[updated]] = await Promise.all([
            t.db
                .update(meetingMinutes)
                .set({ content: body.content })
                .where(eq(meetingMinutes.id, id))
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "meeting_minute",
                entityId: id,
                metadata: { meetingId: existing.meetingId },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/minutes/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_minutes",
            module: "meetings",
        });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.meetingMinutes.findFirst({
            where: scoped(id, t.workspaceId),
        });
        if (!existing) throw new ApiError("Minute not found", 404);

        const [[deleted]] = await Promise.all([
            t.db.delete(meetingMinutes).where(eq(meetingMinutes.id, id)).returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "meeting_minute",
                entityId: id,
                metadata: { meetingId: existing.meetingId },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(deleted ?? { deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/minutes/[id]", e);
    }
}
