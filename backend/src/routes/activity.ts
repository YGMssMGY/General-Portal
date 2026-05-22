import { Hono } from "hono";

const route = new Hono();

route.get("/activity", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const limit = parseInt(c.req.query("limit") || "50", 10);
    const before = c.req.query("before");
    const where: any = { workspaceId: wid };
    if (before) where.occurredAt = { lt: new Date(before) };
    const items = await db.activityLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take: Math.min(limit, 100),
    });
    return c.json(items);
});

route.get("/activity/stats", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [statusBreakdown, topMembers] = await Promise.all([
        db.taskItem.groupBy({
            by: ["status"],
            where: { workspaceId: wid },
            _count: true,
        }),
        db.membership.findMany({
            where: { workspaceId: wid },
            orderBy: { taskCount: "desc" },
            take: 5,
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
        }),
    ]);

    // Task completion trend: tasks marked done in last 30 days, grouped by date
    const doneTasks = await db.taskItem.findMany({
        where: {
            workspaceId: wid,
            status: "done",
            updatedAt: { gte: thirtyDaysAgo },
        },
        select: { updatedAt: true },
    });

    const trendMap = new Map<string, number>();
    for (const t of doneTasks) {
        const day = t.updatedAt.toISOString().slice(0, 10);
        trendMap.set(day, (trendMap.get(day) || 0) + 1);
    }
    const taskCompletionTrend = Array.from(trendMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

    return c.json({
        taskCompletionTrend,
        taskStatusBreakdown: statusBreakdown.map((g) => ({
            status: g.status,
            count: g._count,
        })),
        topContributors: topMembers.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            taskCount: m.taskCount,
            volunteerHours: m.volunteerHours,
        })),
    });
});

export default route;
