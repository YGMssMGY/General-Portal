import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { attendance, events, meetings } from "@/db/schema";
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
import { logger } from "@/lib/logger";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const checkInSchema = z.object({
    meetingId: z.string().uuid().nullable().optional(),
    eventId: z.string().uuid().nullable().optional(),
    code: z.string().trim().max(12).nullable().optional(),
});
type CheckInInput = z.infer<typeof checkInSchema>;

function codesMatch(expected: string, provided: string): boolean {
    const a = Buffer.from(expected.trim());
    const b = Buffer.from(provided.trim());
    return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "check_in", module: "members" });
        const searchParams = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(searchParams);
        const meetingId = searchParams.get("meetingId");
        const eventId = searchParams.get("eventId");

        const conds = [eq(attendance.workspaceId, t.workspaceId), eq(attendance.userId, t.userId)];
        if (meetingId) conds.push(eq(attendance.meetingId, meetingId));
        if (eventId) conds.push(eq(attendance.eventId, eventId));
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
                        [{ column: attendance.createdAt, value: at }],
                        attendance.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.attendance.findMany({
            where: and(...conds),
            orderBy: [desc(attendance.createdAt), desc(attendance.id)],
            limit: limit + 1,
            with: {
                meeting: {
                    columns: { id: true, title: true, startTime: true, deletedAt: true },
                },
                event: { columns: { id: true, title: true, startDate: true, deletedAt: true } },
            },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const res = ok(rows.filter((r) => !r.meeting?.deletedAt && !r.event?.deletedAt));
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/attendance", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "check_in", module: "members" });
        const body = await parseBody<CheckInInput>(checkInSchema as never, request);

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
                columns: { id: true, title: true, checkInCode: true },
            });
            if (!meeting) throw new ApiError("Meeting not found", 404);
            if (meeting.checkInCode && !codesMatch(meeting.checkInCode, body.code ?? "")) {
                throw new ApiError("Invalid check-in code", 400);
            }
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

        const now = new Date();
        const id = randomUUID();
        const conflictTarget = hasMeeting
            ? [attendance.workspaceId, attendance.userId, attendance.meetingId]
            : [attendance.workspaceId, attendance.userId, attendance.eventId];
        const conflictWhere = hasMeeting
            ? sql`${attendance.meetingId} IS NOT NULL`
            : sql`${attendance.eventId} IS NOT NULL`;
        const [row] = await t.db
            .insert(attendance)
            .values({
                id,
                workspaceId: t.workspaceId,
                meetingId: body.meetingId ?? null,
                eventId: body.eventId ?? null,
                userId: t.userId,
                status: "present",
                checkedInAt: now,
            })
            .onConflictDoUpdate({
                target: conflictTarget,
                targetWhere: conflictWhere,
                set: { status: "present", checkedInAt: now },
            })
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "check_in",
            entityType: "attendance",
            entityId: row.id,
            metadata: { meetingId: body.meetingId ?? null, eventId: body.eventId ?? null },
            ipAddress: clientIp(request),
        }).catch((err) => logger.error({ err }, "Check-in side effects failed"));

        return ok(row, row.id === id ? 201 : 200);
    } catch (e) {
        return handleRouteError("POST /api/attendance", e);
    }
}
