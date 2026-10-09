import type { NextRequest } from "next/server";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { events, meetings, tasks, volunteerSlots } from "@/db/schema";
import { ApiError, handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {});
        const { searchParams } = new URL(request.url);
        const now = new Date();

        let start = new Date(now.getFullYear(), now.getMonth(), 1);
        let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const startParam = searchParams.get("start");
        const endParam = searchParams.get("end");
        if (startParam) {
            start = new Date(startParam);
            if (Number.isNaN(start.getTime())) throw new ApiError("Invalid start date", 400);
        }
        if (endParam) {
            end = new Date(endParam);
            if (Number.isNaN(end.getTime())) throw new ApiError("Invalid end date", 400);
        }
        if (start > end) throw new ApiError("Invalid date range", 400);

        const [eventRows, taskRows, meetingRows, slotRows] = await Promise.all([
            t.db.query.events.findMany({
                where: and(
                    eq(events.workspaceId, t.workspaceId),
                    isNull(events.deletedAt),
                    gte(events.startDate, start),
                    lte(events.startDate, end),
                ),
                columns: {
                    id: true,
                    title: true,
                    startDate: true,
                    endDate: true,
                    location: true,
                    status: true,
                },
                limit: 500,
            }),
            t.db.query.tasks.findMany({
                where: and(
                    eq(tasks.workspaceId, t.workspaceId),
                    isNull(tasks.deletedAt),
                    gte(tasks.dueDate, start),
                    lte(tasks.dueDate, end),
                ),
                columns: { id: true, title: true, dueDate: true, status: true, priority: true },
                limit: 500,
            }),
            t.db.query.meetings.findMany({
                where: and(
                    eq(meetings.workspaceId, t.workspaceId),
                    isNull(meetings.deletedAt),
                    gte(meetings.startTime, start),
                    lte(meetings.startTime, end),
                ),
                columns: { id: true, title: true, startTime: true, endTime: true, location: true },
                limit: 500,
            }),
            t.db.query.volunteerSlots.findMany({
                where: and(
                    eq(volunteerSlots.workspaceId, t.workspaceId),
                    isNull(volunteerSlots.deletedAt),
                    gte(volunteerSlots.startTime, start),
                    lte(volunteerSlots.startTime, end),
                ),
                columns: { id: true, title: true, startTime: true, endTime: true },
                limit: 500,
            }),
        ]);

        return ok({ events: eventRows, tasks: taskRows, meetings: meetingRows, slots: slotRows });
    } catch (e) {
        return handleRouteError("GET /api/calendar", e);
    }
}
