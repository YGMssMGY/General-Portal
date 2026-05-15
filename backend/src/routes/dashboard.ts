import { Hono } from "hono";
import { db } from "../lib/db.js";

const route = new Hono();

route.get("/dashboard", async (c) => {
  const workspaceId = c.get("workspaceId");

  const now = new Date();

  const [taskCounts, tasks, upcomingEvents, recentActivity, financeSummary] =
    await Promise.all([
      db.taskItem.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: true,
      }),
      db.taskItem.findMany({
        where: { workspaceId },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      db.eventItem.findMany({
        where: {
          workspaceId,
          startsAt: { gte: now },
        },
        orderBy: { startsAt: "asc" },
        take: 3,
      }),
      db.activityLog.findMany({
        where: { workspaceId },
        orderBy: { occurredAt: "desc" },
        take: 5,
      }),
      db.financeTransaction.groupBy({
        by: ["status"],
        where: { workspaceId },
        _sum: { amount: true },
      }),
    ]);

  const metrics = [
    {
      label: "Total Tasks",
      value: taskCounts.reduce((sum, g) => sum + g._count, 0),
    },
    {
      label: "Upcoming Events",
      value: upcomingEvents.length,
    },
    {
      label: "Pending Proposals",
      value: 0,
    },
    {
      label: "Pending Expenses",
      value: financeSummary
        .filter((f) => f.status === "pending")
        .reduce((sum, f) => sum + (f._sum.amount?.toNumber() || 0), 0),
    },
  ];

  return c.json({
    metrics,
    attention: tasks.filter(
      (t) =>
        t.status === "blocked" ||
        (t.dueDate && t.dueDate < now && t.status !== "done"),
    ),
    myTasks: tasks,
    upcomingEvents,
    recentActivity,
  });
});

export default route;
