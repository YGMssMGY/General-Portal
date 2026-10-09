import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { meetingRsvps, meetings } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const rsvpSchema = z.object({ status: z.enum(["accepted", "declined", "maybe"]).nullable() });
type RsvpInput = z.infer<typeof rsvpSchema>;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "meetings" });
        const { id } = await params;
        requireUuid(id);

        const meeting = await t.db.query.meetings.findFirst({
            where: and(
                eq(meetings.id, id),
                eq(meetings.workspaceId, t.workspaceId),
                isNull(meetings.deletedAt),
            ),
            columns: { id: true, title: true },
        });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        const body = await parseBody<RsvpInput>(rsvpSchema as never, request);

        if (body.status === null) {
            await t.db
                .delete(meetingRsvps)
                .where(and(eq(meetingRsvps.meetingId, id), eq(meetingRsvps.userId, t.userId)));
            return ok({ removed: true });
        }

        const [rsvp] = await t.db
            .insert(meetingRsvps)
            .values({ meetingId: id, userId: t.userId, status: body.status })
            .onConflictDoUpdate({
                target: [meetingRsvps.meetingId, meetingRsvps.userId],
                set: { status: body.status },
            })
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "rsvp",
            entityType: "meeting",
            entityId: id,
            metadata: { title: meeting.title, status: body.status },
            ipAddress: clientIp(request),
        });

        return ok(rsvp);
    } catch (e) {
        return handleRouteError("POST /api/meetings/[id]/rsvp", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "meetings" });
        const { id } = await params;
        requireUuid(id);

        const meeting = await t.db.query.meetings.findFirst({
            where: and(
                eq(meetings.id, id),
                eq(meetings.workspaceId, t.workspaceId),
                isNull(meetings.deletedAt),
            ),
            columns: { id: true },
        });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        const targetUserId = new URL(request.url).searchParams.get("userId") ?? t.userId;
        if (targetUserId !== t.userId && !t.permissions.includes("manage_meetings")) {
            throw new ApiError("Forbidden", 403);
        }

        await t.db
            .delete(meetingRsvps)
            .where(and(eq(meetingRsvps.meetingId, id), eq(meetingRsvps.userId, targetUserId)));

        return ok({ removed: true });
    } catch (e) {
        return handleRouteError("DELETE /api/meetings/[id]/rsvp", e);
    }
}
