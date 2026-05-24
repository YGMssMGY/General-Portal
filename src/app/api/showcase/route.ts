import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const items = await db.showcaseItem.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { sortOrder: "asc" },
      include: {
        createdBy: { select: { name: true } },
      },
    });

    return success(items);
  } catch (e) {
    console.error("GET /api/showcase", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
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
    const { type, title, description, imageUrl, linkUrl } = body;

    if (!type || typeof type !== "string") return error("Type is required", 400);
    if (!title || typeof title !== "string" || !title.trim()) return error("Title is required", 400);

    const item = await db.showcaseItem.create({
      data: {
        workspaceId: workspace.id,
        type,
        title: title.trim(),
        description: description?.trim() ?? null,
        imageUrl: imageUrl ?? null,
        linkUrl: linkUrl ?? null,
        createdById: session.user.id,
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create",
        entityType: "showcase_item",
        entityId: item.id,
        metadata: { title: item.title, type },
      },
      db,
    );

    return success(item, 201);
  } catch (e) {
    console.error("POST /api/showcase", e);
    return error("Internal server error", 500);
  }
}
