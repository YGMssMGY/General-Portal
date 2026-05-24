import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const portal = session.user.portal;
    if (!portal) return error("No portal selected", 400);

    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const workspaceId = workspace.id;

    const [taskCounts, upcomingEvents, pendingProposals, unreadNotifications, memberCount, recentActivity] =
      await Promise.all([
        db.taskItem.groupBy({
          by: ["status"],
          where: { workspaceId },
          _count: true,
        }),
        db.eventItem.findMany({
          where: {
            workspaceId,
            status: "published",
            startDate: { gte: new Date() },
          },
          orderBy: { startDate: "asc" },
          take: 5,
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true,
          },
        }),
        db.proposal.count({
          where: { workspaceId, status: "pending" },
        }),
        db.notification.count({
          where: { workspaceId, userId: session.user.id, read: false },
        }),
        db.membership.count({
          where: { workspaceId },
        }),
        db.activityFeed.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: { select: { id: true, name: true, image: true } },
          },
        }),
      ]);

    const tasks = taskCounts.reduce(
      (acc, row) => {
        acc[row.status] = row._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return success({
      tasks,
      upcomingEvents,
      pendingProposals,
      unreadNotifications,
      totalMembers: memberCount,
      recentActivity,
    });
  } catch (e) {
    console.error("GET /api/dashboard", e);
    return error("Internal server error", 500);
  }
}
