import type { NextRequest } from "next/server";
import { and, asc, count, desc, eq, gte, isNull, ne } from "drizzle-orm";
import { activityFeed, events, memberships, notifications, proposals, tasks } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {});
        const now = new Date();

        const [taskGroups, upcomingEvents, pendingRows, unreadRows, memberRows, recentActivity] =
            await Promise.all([
                t.db
                    .select({ status: tasks.status, n: count() })
                    .from(tasks)
                    .where(
                        and(
                            eq(tasks.workspaceId, t.workspaceId),
                            eq(tasks.assigneeId, t.userId),
                            ne(tasks.status, "done"),
                            isNull(tasks.deletedAt),
                        ),
                    )
                    .groupBy(tasks.status),
                t.db.query.events.findMany({
                    where: and(
                        eq(events.workspaceId, t.workspaceId),
                        isNull(events.deletedAt),
                        eq(events.status, "published"),
                        gte(events.startDate, now),
                    ),
                    orderBy: [asc(events.startDate), asc(events.id)],
                    limit: 5,
                    columns: {
                        id: true,
                        title: true,
                        startDate: true,
                        endDate: true,
                        location: true,
                    },
                }),
                t.db
                    .select({ n: count() })
                    .from(proposals)
                    .where(
                        and(
                            eq(proposals.workspaceId, t.workspaceId),
                            eq(proposals.status, "pending"),
                            isNull(proposals.deletedAt),
                        ),
                    ),
                t.db
                    .select({ n: count() })
                    .from(notifications)
                    .where(
                        and(
                            eq(notifications.workspaceId, t.workspaceId),
                            eq(notifications.userId, t.userId),
                            eq(notifications.read, false),
                        ),
                    ),
                t.db
                    .select({ n: count() })
                    .from(memberships)
                    .where(eq(memberships.workspaceId, t.workspaceId)),
                t.db.query.activityFeed.findMany({
                    where: eq(activityFeed.workspaceId, t.workspaceId),
                    orderBy: [desc(activityFeed.createdAt), desc(activityFeed.id)],
                    limit: 8,
                    with: { user: { columns: { id: true, name: true, email: true, image: true } } },
                }),
            ]);

        const taskMap: Record<string, number> = {};
        for (const g of taskGroups) taskMap[g.status] = g.n;

        return ok({
            tasks: taskMap,
            upcomingEvents,
            pendingProposals: pendingRows[0]?.n ?? 0,
            unreadNotifications: unreadRows[0]?.n ?? 0,
            totalMembers: memberRows[0]?.n ?? 0,
            recentActivity,
        });
    } catch (e) {
        return handleRouteError("GET /api/dashboard", e);
    }
}
