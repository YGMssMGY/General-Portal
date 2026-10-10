import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { attendance } from "@/db/schema";
import { ApiError, handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const searchParams = new URL(request.url).searchParams;
        const meetingId = searchParams.get("meetingId");
        const eventId = searchParams.get("eventId");
        if ((meetingId ? 1 : 0) + (eventId ? 1 : 0) !== 1) {
            throw new ApiError("Provide exactly one of meetingId or eventId", 400);
        }

        const conds = [eq(attendance.workspaceId, t.workspaceId)];
        if (meetingId) conds.push(eq(attendance.meetingId, meetingId));
        if (eventId) conds.push(eq(attendance.eventId, eventId));

        const rows = await t.db.query.attendance.findMany({
            where: and(...conds),
            columns: { status: true },
        });

        const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
        const total = rows.length;

        return ok({ present, total, rate: total === 0 ? 0 : present / total });
    } catch (e) {
        return handleRouteError("GET /api/attendance/rate", e);
    }
}
