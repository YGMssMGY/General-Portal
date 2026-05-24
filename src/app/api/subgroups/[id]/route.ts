import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const subgroup = await db.subgroup.findFirst({
      where: { id, workspaceId: workspace.id },
      include: {
        _count: { select: { members: true } },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });
    if (!subgroup) return error("Subgroup not found", 404);

    return success(subgroup);
  } catch (e) {
    console.error("GET /api/subgroups/[id]", e);
    return error("Internal server error", 500);
  }
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

    if (!hasPermission(session.user.role, "manage_subgroups")) {
      return error("Forbidden", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const { id } = await params;

    const existing = await db.subgroup.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!existing) return error("Subgroup not found", 404);

    const body = await request.json();
    const { name, description, color } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (color !== undefined) data.color = color ?? null;

    const updated = await db.subgroup.update({
      where: { id },
      data,
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "update",
        entityType: "subgroup",
        entityId: id,
        metadata: { name: updated.name },
      },
      db,
    );

    return success(updated);
  } catch (e) {
    console.error("PUT /api/subgroups/[id]", e);
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

    if (!hasPermission(session.user.role, "manage_subgroups")) {
      return error("Forbidden", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const { id } = await params;

    const existing = await db.subgroup.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!existing) return error("Subgroup not found", 404);

    await db.subgroup.delete({ where: { id } });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "delete",
        entityType: "subgroup",
        entityId: id,
        metadata: { name: existing.name },
      },
      db,
    );

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/subgroups/[id]", e);
    return error("Internal server error", 500);
  }
}
