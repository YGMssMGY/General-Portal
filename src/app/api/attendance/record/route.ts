import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { attendance, events, meetings } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody } from "@/lib/api";
import { logger } from "@/lib/logger";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const recordSchema = z.object({
    meetingId: z.string().uuid().nullable().optional(),
    eventId: z.string().uuid().nullable().optional(),
    userId: z.string().uuid(),
    status: z.enum(["present", "absent", "late", "excused"]),
});
type RecordInput = z.infer<typeof recordSchema>;

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_attendance",
            module: "members",
        });
        const body = await parseBody<RecordInput>(recordSchema as never, request);

        const hasMeeting = !!body.meetingId;
        const hasEvent = !!body.eventId;
        if (hasMeeting === hasEvent) {
            throw new ApiError("Provide exactly one of meetingId or eventId", 400);
        }

        if (hasMeeting) {
            const meeting = await t.db.query.meetings.findFirst({
                where: and(
                    eq(meetings.id, body.meetingId!),
                    eq(meetings.workspaceId, t.workspaceId),
                    isNull(meetings.deletedAt),
                ),
                columns: { id: true },
            });
            if (!meeting) throw new ApiError("Meeting not found", 404);
        } else {
            const event = await t.db.query.events.findFirst({
                where: and(
                    eq(events.id, body.eventId!),
                    eq(events.workspaceId, t.workspaceId),
                    isNull(events.deletedAt),
                ),
                columns: { id: true },
            });
            if (!event) throw new ApiError("Event not found", 404);
        }

        const values = {
            status: body.status,
            checkedInAt: body.status === "present" || body.status === "late" ? new Date() : null,
        };
        const conflictTarget = hasMeeting
            ? [attendance.workspaceId, attendance.userId, attendance.meetingId]
            : [attendance.workspaceId, attendance.userId, attendance.eventId];
        const conflictWhere = hasMeeting
            ? sql`${attendance.meetingId} IS NOT NULL`
            : sql`${attendance.eventId} IS NOT NULL`;
        const id = randomUUID();
        const [row] = await t.db
            .insert(attendance)
            .values({
                id,
                workspaceId: t.workspaceId,
                meetingId: body.meetingId ?? null,
                eventId: body.eventId ?? null,
                userId: body.userId,
                ...values,
            })
            .onConflictDoUpdate({
                target: conflictTarget,
                targetWhere: conflictWhere,
                set: values,
            })
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "record_attendance",
            entityType: "attendance",
            entityId: row.id,
            metadata: {
                meetingId: body.meetingId ?? null,
                eventId: body.eventId ?? null,
                targetUserId: body.userId,
                status: body.status,
            },
            ipAddress: clientIp(request),
        }).catch((err) => logger.error({ err }, "Record-attendance side effects failed"));

        return ok(row, row.id === id ? 201 : 200);
    } catch (e) {
        return handleRouteError("POST /api/attendance/record", e);
    }
}
