import cron from "node-cron";
import { PrismaClient } from "@prisma/client";

const PORTAL_DATABASES: Record<string, string | undefined> = {
  developers: process.env.DATABASE_URL_DEVELOPERS,
  stuco: process.env.DATABASE_URL_STUCO,
};

async function processPortal(portal: string) {
  const url = PORTAL_DATABASES[portal];
  if (!url) return;

  const db = new PrismaClient({ datasourceUrl: url });

  try {
    const workspace = await db.workspace.findUnique({ where: { slug: portal } });
    if (!workspace) return;

    const memberships = await db.membership.findMany({
      where: { workspaceId: workspace.id },
      include: { user: true },
    });

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const membership of memberships) {
      const pendingTasks = await db.taskItem.count({
        where: {
          workspaceId: workspace.id,
          assigneeId: membership.userId,
          status: { not: "done" },
        },
      });

      const upcomingEvents = await db.eventItem.count({
        where: {
          workspaceId: workspace.id,
          startDate: { gte: now, lte: tomorrow },
        },
      });

      if (pendingTasks > 0) {
        await db.notification.create({
          data: {
            workspaceId: workspace.id,
            userId: membership.userId,
            title: `You have ${pendingTasks} pending task${pendingTasks > 1 ? "s" : ""}`,
            type: "nudge",
            link: `/${portal}/tasks`,
          },
        });
      }

      if (upcomingEvents > 0) {
        await db.notification.create({
          data: {
            workspaceId: workspace.id,
            userId: membership.userId,
            title: `${upcomingEvents} event${upcomingEvents > 1 ? "s" : ""} starting soon`,
            type: "nudge",
            link: `/${portal}/events`,
          },
        });
      }
    }
  } finally {
    await db.$disconnect();
  }
}

export function startCron() {
  cron.schedule("0 * * * *", async () => {
    console.log("[Cron] Running hourly nudge check...");
    await Promise.allSettled([
      processPortal("developers"),
      processPortal("stuco"),
    ]);
    console.log("[Cron] Hourly nudge check complete");
  });

  console.log("[Cron] Hourly nudge notifications scheduled");
}
