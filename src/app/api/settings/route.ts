import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbForPortal } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const portal = (session.user as any).portal;
    const db = getDbForPortal(portal);

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    return success({
      id: workspace.id,
      name: workspace.name,
      settings: (workspace.settings as Record<string, boolean>) || {},
    });
  } catch (e) {
    console.error("GET /api/settings", e);
    return error("Internal server error", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const portal = (session.user as any).portal;
    const db = getDbForPortal(portal);

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { settings } = body;

    const updated = await db.workspace.update({
      where: { id: workspace.id },
      data: { settings },
    });

    return success({
      id: updated.id,
      name: updated.name,
      settings: (updated.settings as Record<string, boolean>) || {},
    });
  } catch (e) {
    console.error("PUT /api/settings", e);
    return error("Internal server error", 500);
  }
}
