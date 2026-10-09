import { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { meetingRsvps, meetings } from "@/db/schema";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parsePagination,
    requireUuid,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "meetings" });
        const { id } = await params;
        requireUuid(id);
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const meeting = await t.db.query.meetings.findFirst({
            where: and(
                eq(meetings.id, id),
                eq(meetings.workspaceId, t.workspaceId),
                isNull(meetings.deletedAt),
            ),
            columns: { id: true },
        });
        if (!meeting) throw new ApiError("Meeting not found", 404);

        const conds = [eq(meetingRsvps.meetingId, id)];
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
                        [{ column: meetingRsvps.createdAt, value: at }],
                        meetingRsvps.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.meetingRsvps.findMany({
            where: and(...conds),
            orderBy: [desc(meetingRsvps.createdAt), desc(meetingRsvps.id)],
            limit: limit + 1,
            with: { user: { columns: { id: true, name: true, email: true, image: true } } },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const items = rows.map((r) => ({
            id: r.id,
            status: r.status,
            createdAt: r.createdAt,
            user: r.user,
        }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/meetings/[id]/rsvps", e);
    }
}
