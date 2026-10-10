import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { meetingMinutes, meetings } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const createMinuteSchema = z.object({ content: z.string().trim().min(1) });
type CreateMinuteInput = z.infer<typeof createMinuteSchema>;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const rows = await t.db.query.meetingMinutes.findMany({
            where: and(
                eq(meetingMinutes.workspaceId, t.workspaceId),
                eq(meetingMinutes.meetingId, id),
            ),
            orderBy: [asc(meetingMinutes.createdAt)],
            with: {
                createdBy: { columns: { id: true, name: true, email: true, image: true } },
            },
        });

        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/meetings/[id]/minutes", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_minutes",
            module: "meetings",
        });
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

        const body = await parseBody<CreateMinuteInput>(createMinuteSchema as never, request);

        const minuteId = randomUUID();
        const [[minute]] = await Promise.all([
            t.db
                .insert(meetingMinutes)
                .values({
                    id: minuteId,
                    workspaceId: t.workspaceId,
                    meetingId: id,
                    content: body.content,
                    createdById: t.userId,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create",
                entityType: "meeting_minute",
                entityId: minuteId,
                metadata: { meetingId: id, title: meeting.title },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(minute, 201);
    } catch (e) {
        return handleRouteError("POST /api/meetings/[id]/minutes", e);
    }
}
