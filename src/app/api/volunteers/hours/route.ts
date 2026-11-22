import type { NextRequest } from "next/server";
import { and, eq, isNull, lt } from "drizzle-orm";
import { volunteerSignups, volunteerSlots } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "volunteers" });
        const requested = new URL(request.url).searchParams.get("userId");
        const targetId = requested ?? t.userId;
        if (requested) requireUuid(requested, "userId");
        if (targetId !== t.userId && !t.permissions.includes("manage_volunteer_slots")) {
            throw new ApiError("Forbidden", 403);
        }
        const now = new Date();
        const rows = await t.db
            .select({
                slotId: volunteerSlots.id,
                title: volunteerSlots.title,
                startTime: volunteerSlots.startTime,
                endTime: volunteerSlots.endTime,
            })
            .from(volunteerSignups)
            .innerJoin(volunteerSlots, eq(volunteerSignups.slotId, volunteerSlots.id))
            .where(
                and(
                    eq(volunteerSignups.userId, targetId),
                    eq(volunteerSlots.workspaceId, t.workspaceId),
                    isNull(volunteerSlots.deletedAt),
                    lt(volunteerSlots.endTime, now),
                ),
            );
        const breakdown = rows.map((row) => ({
            slotId: row.slotId,
            title: row.title,
            hours: Math.max(
                0,
                Math.round(((row.endTime.getTime() - row.startTime.getTime()) / 3_600_000) * 100) /
                    100,
            ),
            date: row.startTime,
        }));
        breakdown.sort((a, b) => b.date.getTime() - a.date.getTime());
        const total = Math.round(breakdown.reduce((sum, b) => sum + b.hours, 0) * 100) / 100;
        return ok({ userId: targetId, hours: total, breakdown });
    } catch (e) {
        return handleRouteError("GET /api/volunteers/hours", e);
    }
}
