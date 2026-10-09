import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { meetingRsvps, meetings } from "@/db/schema";
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
import { requireTenant } from "@/lib/tenant";

const createMeetingSchema = z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().nullable().optional(),
    startTime: z.string().min(1),
    endTime: z.string().nullable().optional(),
    location: z.string().trim().nullable().optional(),
});
type CreateMeetingInput = z.infer<typeof createMeetingSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "meetings" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const conds = [eq(meetings.workspaceId, t.workspaceId), isNull(meetings.deletedAt)];
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
                    keysetWhere([{ column: meetings.startTime, value: at }], meetings.id, vals[1]),
                );
            }
        }

        const rows = await t.db.query.meetings.findMany({
            where: and(...conds),
            orderBy: [desc(meetings.startTime), desc(meetings.id)],
            limit: limit + 1,
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.startTime.toISOString(), last.id]);
        }

        const ids = rows.map((r) => r.id);
        const [counts, mine] = await Promise.all([
            ids.length > 0
                ? t.db
                      .select({ meetingId: meetingRsvps.meetingId, n: count(meetingRsvps.id) })
                      .from(meetingRsvps)
                      .where(inArray(meetingRsvps.meetingId, ids))
                      .groupBy(meetingRsvps.meetingId)
                : [],
            ids.length > 0
                ? t.db.query.meetingRsvps.findMany({
                      where: and(
                          inArray(meetingRsvps.meetingId, ids),
                          eq(meetingRsvps.userId, t.userId),
                      ),
                      columns: { meetingId: true, status: true },
                  })
                : [],
        ]);
        const countMap = new Map(counts.map((c) => [c.meetingId, c.n]));
        const mineMap = new Map(mine.map((m) => [m.meetingId, m.status]));

        const items = rows.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            startTime: m.startTime,
            endTime: m.endTime,
            location: m.location,
            status: m.status,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            rsvpCount: countMap.get(m.id) ?? 0,
            myRsvp: mineMap.get(m.id) ?? null,
        }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/meetings", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_meetings",
            module: "meetings",
        });
        const body = await parseBody<CreateMeetingInput>(createMeetingSchema as never, request);

        const startTime = new Date(body.startTime);
        if (Number.isNaN(startTime.getTime())) throw new ApiError("Invalid startTime", 400);
        let endTime: Date | null = null;
        if (body.endTime) {
            endTime = new Date(body.endTime);
            if (Number.isNaN(endTime.getTime())) throw new ApiError("Invalid endTime", 400);
        }

        const id = randomUUID();
        const [[meeting]] = await Promise.all([
            t.db
                .insert(meetings)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    title: body.title,
                    description: body.description ?? null,
                    startTime,
                    endTime,
                    location: body.location ?? null,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create",
                entityType: "meeting",
                entityId: id,
                metadata: { title: body.title },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(meeting, 201);
    } catch (e) {
        return handleRouteError("POST /api/meetings", e);
    }
}
