import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const portal = session.user.portal;

    if (!hasPermission(session.user.role, "manage_showcase")) {
      return error("Forbidden", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const { id } = await params;

    const existing = await db.showcaseItem.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!existing) return error("Showcase item not found", 404);

    const body = await request.json();
    const { title, description, imageUrl, linkUrl, sortOrder, isActive } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (imageUrl !== undefined) data.imageUrl = imageUrl ?? null;
    if (linkUrl !== undefined) data.linkUrl = linkUrl ?? null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await db.showcaseItem.update({
      where: { id },
      data,
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "update",
        entityType: "showcase_item",
        entityId: id,
        metadata: { title: updated.title },
      },
      db,
    );

    return success(updated);
  } catch (e) {
    console.error("PUT /api/showcase/[id]", e);
    return error("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const portal = session.user.portal;

    if (!hasPermission(session.user.role, "manage_showcase")) {
      return error("Forbidden", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const { id } = await params;

    const existing = await db.showcaseItem.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!existing) return error("Showcase item not found", 404);

    await db.showcaseItem.delete({ where: { id } });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "delete",
        entityType: "showcase_item",
        entityId: id,
        metadata: { title: existing.title },
      },
      db,
    );

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/showcase/[id]", e);
    return error("Internal server error", 500);
  }
}
