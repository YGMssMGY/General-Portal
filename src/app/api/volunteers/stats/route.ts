import { NextRequest } from "next/server";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { users, volunteerSignups, volunteerSlots } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "volunteers" });
        const now = new Date();
        const ws = eq(volunteerSlots.workspaceId, t.workspaceId);
        const live = isNull(volunteerSlots.deletedAt);

        const [[{ n: totalSlots }], [{ n: totalSignups }], [{ n: upcomingSlots }], top] =
            await Promise.all([
                t.db.select({ n: count() }).from(volunteerSlots).where(and(ws, live)),
                t.db
                    .select({ n: count() })
                    .from(volunteerSignups)
                    .innerJoin(volunteerSlots, eq(volunteerSignups.slotId, volunteerSlots.id))
                    .where(and(ws, live)),
                t.db
                    .select({ n: count() })
                    .from(volunteerSlots)
                    .where(and(ws, live, gte(volunteerSlots.startTime, now))),
                t.db
                    .select({
                        userId: volunteerSignups.userId,
                        name: users.name,
                        n: count(volunteerSignups.id),
                    })
                    .from(volunteerSignups)
                    .innerJoin(volunteerSlots, eq(volunteerSignups.slotId, volunteerSlots.id))
                    .innerJoin(users, eq(volunteerSignups.userId, users.id))
                    .where(and(ws, live))
                    .groupBy(volunteerSignups.userId, users.name)
                    .orderBy(desc(count(volunteerSignups.id)))
                    .limit(10),
            ]);

        return ok({
            totalSlots,
            totalSignups,
            upcomingSlots,
            topVolunteers: top.map((r) => ({ userId: r.userId, name: r.name, count: r.n })),
        });
    } catch (e) {
        return handleRouteError("GET /api/volunteers/stats", e);
    }
}
