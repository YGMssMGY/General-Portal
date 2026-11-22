import { NextRequest } from "next/server";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { memberships, sessions, users } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const WINDOW_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const cutoff = new Date(Date.now() - WINDOW_MS);

        const online = await t.db
            .select({
                userId: users.id,
                name: users.name,
                image: users.image,
                lastSeenAt: sql<string>`max(${sessions.lastSeenAt})::text`,
            })
            .from(sessions)
            .innerJoin(users, eq(sessions.userId, users.id))
            .innerJoin(
                memberships,
                and(eq(memberships.userId, users.id), eq(memberships.workspaceId, t.workspaceId)),
            )
            .where(
                and(
                    isNull(sessions.revokedAt),
                    gt(sessions.lastSeenAt, cutoff),
                    eq(users.disabled, false),
                ),
            )
            .groupBy(users.id, users.name, users.image)
            .orderBy(desc(sql`max(${sessions.lastSeenAt})`))
            .limit(100);

        return ok({ online });
    } catch (e) {
        return handleRouteError("GET /api/presence", e);
    }
}
