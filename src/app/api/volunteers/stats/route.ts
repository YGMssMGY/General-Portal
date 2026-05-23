import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const [totalSlots, totalSignups] = await Promise.all([
      db.volunteerSlot.count({ where: { workspaceId: workspace.id } }),
      db.volunteerSignup.count({
        where: { slot: { workspaceId: workspace.id } },
      }),
    ]);

    const topSignups = await db.volunteerSignup.groupBy({
      by: ["userId"],
      where: { slot: { workspaceId: workspace.id } },
      _count: true,
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    });

    const userIds = topSignups.map((s) => s.userId);
    const users = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, image: true },
        })
      : [];

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const topVolunteers = topSignups.map((s) => ({
      user: userMap[s.userId] ?? null,
      count: s._count,
    }));

    return success({ totalSlots, totalSignups, topVolunteers });
  } catch (e) {
    console.error("GET /api/volunteers/stats", e);
    return error("Internal server error", 500);
  }
}
