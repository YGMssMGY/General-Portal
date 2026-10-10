import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { volunteerSignups } from "@/db/schema";
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
        const rows = await t.db.query.volunteerSignups.findMany({
            where: eq(volunteerSignups.userId, targetId),
            with: { slot: true },
        });
        const now = Date.now();
        const breakdown: Array<{ slotId: string; title: string; hours: number; date: Date }> = [];
        for (const row of rows) {
            const slot = row.slot;
            if (!slot || slot.workspaceId !== t.workspaceId) continue;
            if (slot.deletedAt) continue;
            if (slot.endTime.getTime() >= now) continue;
            const hours = Math.max(
                0,
                Math.round(
                    ((slot.endTime.getTime() - slot.startTime.getTime()) / 3_600_000) * 100,
                ) / 100,
            );
            breakdown.push({ slotId: slot.id, title: slot.title, hours, date: slot.startTime });
        }
        breakdown.sort((a, b) => b.date.getTime() - a.date.getTime());
        const total = Math.round(breakdown.reduce((sum, b) => sum + b.hours, 0) * 100) / 100;
        return ok({ userId: targetId, hours: total, breakdown });
    } catch (e) {
        return handleRouteError("GET /api/volunteers/hours", e);
    }
}
