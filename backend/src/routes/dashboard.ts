import { Hono } from "hono";

const route = new Hono();

route.get("/dashboard", async (c) => {
    const db = c.get("db");
    const workspaceId = c.get("workspaceId");

    const now = new Date();

    const [
        taskCounts,
        tasks,
        upcomingEvents,
        recentActivity,
        financeSummary,
        overdueTaskCount,
        unreadThreadCount,
        pendingProposalsCount,
        topMembers,
        memberCount,
    ] = await db.$transaction([
        db.taskItem.groupBy({
            by: ["status"],
            where: { workspaceId },
            _count: true,
        }),
        db.taskItem.findMany({
            where: { workspaceId },
            orderBy: { dueDate: "asc" },
            take: 10,
        }),
        db.eventItem.findMany({
            where: {
                workspaceId,
                startsAt: { gte: now },
            },
            orderBy: { startsAt: "asc" },
            take: 8,
        }),
        db.activityLog.findMany({
            where: { workspaceId },
            orderBy: { occurredAt: "desc" },
            take: 10,
        }),
        db.financeTransaction.groupBy({
            by: ["status"],
            where: { workspaceId },
            _sum: { amount: true },
        }),
        db.taskItem.count({
            where: {
                workspaceId,
                dueDate: { lt: now },
                status: { not: "done" },
            },
        }),
        db.messageThread.aggregate({
            where: { workspaceId },
            _sum: { unreadCount: true },
        }),
        db.proposal.count({
            where: { workspaceId, status: "submitted" },
        }),
        db.membership.findMany({
            where: { workspaceId },
            orderBy: { taskCount: "desc" },
            take: 1,
            include: {
                user: {
                    select: { id: true, name: true, email: true, image: true },
                },
            },
        }),
        db.membership.count({ where: { workspaceId } }),
    ]);

    const totalTaskCount = taskCounts.reduce((sum, g) => sum + g._count, 0);
    const doneCount = taskCounts.find((g) => g.status === "done")?._count ?? 0;
    const taskCompletionRate =
        totalTaskCount > 0 ? Math.round((doneCount / totalTaskCount) * 100) : 0;

    const metrics = [
        {
            label: "Total Tasks",
            value: String(totalTaskCount),
            tone: "primary" as const,
            icon: "task",
        },
        {
            label: "Upcoming Events",
            value: String(upcomingEvents.length),
            tone: "secondary" as const,
            icon: "event",
        },
        {
            label: "Pending Proposals",
            value: String(pendingProposalsCount),
            tone: "tertiary" as const,
            icon: "proposal",
        },
        {
            label: "Pending Expenses",
            value: String(
                financeSummary
                    .filter((f) => f.status === "pending")
                    .reduce((sum, f) => sum + (f._sum.amount?.toNumber() || 0), 0),
            ),
            tone: "danger" as const,
            icon: "finance",
        },
        {
            label: "Members",
            value: String(memberCount),
            tone: "primary" as const,
            icon: "member",
        },
        {
            label: "Overdue Tasks",
            value: String(overdueTaskCount),
            tone: "danger" as const,
            icon: "task",
        },
        {
            label: "Completion Rate",
            value: `${taskCompletionRate}%`,
            tone: "secondary" as const,
            icon: "task",
        },
    ];

    return c.json({
        metrics,
        attention: tasks.filter(
            (t) => t.status === "blocked" || (t.dueDate && t.dueDate < now && t.status !== "done"),
        ),
        myTasks: tasks,
        upcomingEvents,
        recentActivity,
        overdueTaskCount,
        memberCount,
        taskCompletionRate,
        unreadThreadCount: unreadThreadCount._sum.unreadCount || 0,
        pendingProposalsCount,
        topContributor:
            topMembers.length > 0
                ? {
                      id: topMembers[0].user.id,
                      name: topMembers[0].user.name,
                      email: topMembers[0].user.email,
                      image: topMembers[0].user.image,
                      taskCount: topMembers[0].taskCount,
                      volunteerHours: topMembers[0].volunteerHours,
                  }
                : null,
    });
});

export default route;
