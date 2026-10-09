import { NextRequest } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { meetingRsvps, meetings } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const updateMeetingSchema = z.object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    startTime: z.string().min(1).optional(),
    endTime: z.string().nullable().optional(),
    location: z.string().trim().nullable().optional(),
    status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]).optional(),
});
type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;

function scoped(id: string, workspaceId: string) {
    return and(
        eq(meetings.id, id),
        eq(meetings.workspaceId, workspaceId),
        isNull(meetings.deletedAt),
    );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "meetings" });
        const { id } = await params;
        requireUuid(id);

        const [meeting, [{ n: rsvpCount }]] = await Promise.all([
            t.db.query.meetings.findFirst({
                where: scoped(id, t.workspaceId),
                with: {
                    rsvps: {
                        where: eq(meetingRsvps.userId, t.userId),
                        columns: { status: true },
                        limit: 1,
                    },
                },
            }),
            t.db.select({ n: count() }).from(meetingRsvps).where(eq(meetingRsvps.meetingId, id)),
        ]);
        if (!meeting) throw new ApiError("Meeting not found", 404);

        const { rsvps, ...rest } = meeting;
        return ok({ ...rest, rsvpCount, myRsvp: rsvps[0]?.status ?? null });
    } catch (e) {
        return handleRouteError("GET /api/meetings/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_meetings",
            module: "meetings",
        });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.meetings.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Meeting not found", 404);

        const body = await parseBody<UpdateMeetingInput>(updateMeetingSchema as never, request);

        const set: Partial<typeof meetings.$inferInsert> & { updatedAt: Date } = {
            updatedAt: new Date(),
        };
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description;
        if (body.location !== undefined) set.location = body.location;
        if (body.status !== undefined) set.status = body.status;
        if (body.startTime !== undefined) {
            const d = new Date(body.startTime);
            if (Number.isNaN(d.getTime())) throw new ApiError("Invalid startTime", 400);
            set.startTime = d;
        }
        if (body.endTime !== undefined) {
            if (body.endTime === null || body.endTime === "") {
                set.endTime = null;
            } else {
                const d = new Date(body.endTime);
                if (Number.isNaN(d.getTime())) throw new ApiError("Invalid endTime", 400);
                set.endTime = d;
            }
        }
        if (Object.keys(set).length <= 1) throw new ApiError("No fields to update", 400);

        const [[updated]] = await Promise.all([
            t.db.update(meetings).set(set).where(eq(meetings.id, id)).returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "meeting",
                entityId: id,
                metadata: { changes: Object.keys(set).filter((k) => k !== "updatedAt") },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/meetings/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_meetings",
            module: "meetings",
        });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.meetings.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Meeting not found", 404);

        const permanent = new URL(request.url).searchParams.get("permanent") === "true";
        const sideEffect = emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "delete",
            entityType: "meeting",
            entityId: id,
            metadata: { title: existing.title },
            ipAddress: clientIp(request),
        });
        if (permanent && t.roleName === "admin") {
            await Promise.all([t.db.delete(meetings).where(eq(meetings.id, id)), sideEffect]);
        } else {
            await Promise.all([
                t.db
                    .update(meetings)
                    .set({ deletedAt: new Date(), updatedAt: new Date() })
                    .where(eq(meetings.id, id)),
                sideEffect,
            ]);
        }

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/meetings/[id]", e);
    }
}
