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

    const grouped = await db.kudos.groupBy({
      by: ["receiverId"],
      where: { workspaceId: workspace.id },
      _count: true,
      orderBy: { _count: { receiverId: "desc" } },
      take: 20,
    });

    const userIds = grouped.map((g) => g.receiverId);
    const users = userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, image: true },
        })
      : [];

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const leaderboard = grouped.map((g) => ({
      userId: g.receiverId,
      userName: userMap[g.receiverId]?.name ?? "Unknown",
      userEmail: userMap[g.receiverId]?.email ?? null,
      userImage: userMap[g.receiverId]?.image ?? null,
      count: g._count,
    }));

    return success(leaderboard);
  } catch (e) {
    console.error("GET /api/kudos/leaderboard", e);
    return error("Internal server error", 500);
  }
}
