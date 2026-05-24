import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = session.user.portal;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    await db.notification.updateMany({
      where: { workspaceId: workspace.id, userId: session.user.id, read: false },
      data: { read: true },
    });

    return success({ updated: true });
  } catch (e) {
    console.error("POST /api/notifications/read-all", e);
    return error("Internal server error", 500);
  }
}
