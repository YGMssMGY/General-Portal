import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { attendance, events, meetings } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody } from "@/lib/api";
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

        const target = hasMeeting
            ? and(
                  eq(attendance.workspaceId, t.workspaceId),
                  eq(attendance.userId, body.userId),
                  eq(attendance.meetingId, body.meetingId!),
              )
            : and(
                  eq(attendance.workspaceId, t.workspaceId),
                  eq(attendance.userId, body.userId),
                  eq(attendance.eventId, body.eventId!),
              );
        const existing = await t.db.query.attendance.findFirst({ where: target });

        const values = {
            status: body.status,
            checkedInAt: body.status === "present" || body.status === "late" ? new Date() : null,
        };
        const sideEffect = {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "record_attendance",
            entityType: "attendance",
            metadata: {
                meetingId: body.meetingId ?? null,
                eventId: body.eventId ?? null,
                targetUserId: body.userId,
                status: body.status,
            },
            ipAddress: clientIp(request),
        };

        if (existing) {
            const [[updated]] = await Promise.all([
                t.db
                    .update(attendance)
                    .set(values)
                    .where(eq(attendance.id, existing.id))
                    .returning(),
                emitSideEffects(t.db, { ...sideEffect, entityId: existing.id }),
            ]);
            return ok(updated);
        }

        const id = randomUUID();
        const [[created]] = await Promise.all([
            t.db
                .insert(attendance)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    meetingId: body.meetingId ?? null,
                    eventId: body.eventId ?? null,
                    userId: body.userId,
                    ...values,
                })
                .returning(),
            emitSideEffects(t.db, { ...sideEffect, entityId: id }),
        ]);

        return ok(created, 201);
    } catch (e) {
        return handleRouteError("POST /api/attendance/record", e);
    }
}
