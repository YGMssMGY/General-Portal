import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;

    if (!hasPermission(session.user.role, "manage_showcase")) {
      return error("Forbidden", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return error("items array is required", 400);
    }

    const updates = items.map((item: { id: string; sortOrder: number }) =>
      db.showcaseItem.updateMany({
        where: { id: item.id, workspaceId: workspace.id },
        data: { sortOrder: item.sortOrder },
      }),
    );

    await db.$transaction(updates);

    return success({ reordered: true });
  } catch (e) {
    console.error("PUT /api/showcase/reorder", e);
    return error("Internal server error", 500);
  }
}
