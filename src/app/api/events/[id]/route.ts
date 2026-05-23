import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const event = await db.eventItem.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!event || event.workspaceId !== workspace.id) {
      return error("Event not found", 404);
    }

    return success(event);
  } catch (e) {
    console.error("GET /api/events/[id]", e);
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
    const portal = (session.user as any).portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const existing = await db.eventItem.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Event not found", 404);
    }

    const body = await request.json();
    const { title, description, startDate, endDate, location, isPublic, status } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (startDate !== undefined) data.startDate = new Date(startDate);
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;
    if (location !== undefined) data.location = location;
    if (isPublic !== undefined) data.isPublic = isPublic;
    if (status !== undefined) data.status = status;

    if (Object.keys(data).length === 0) {
      return error("No fields to update", 400);
    }

    const event = await db.eventItem.update({ where: { id }, data });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "update",
        entityType: "event",
        entityId: id,
        metadata: { changes: data },
      },
      db,
    );

    return success(event);
  } catch (e) {
    console.error("PUT /api/events/[id]", e);
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
    const portal = (session.user as any).portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const existing = await db.eventItem.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Event not found", 404);
    }

    await db.eventItem.delete({ where: { id } });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "delete",
        entityType: "event",
        entityId: id,
        metadata: { title: existing.title },
      },
      db,
    );

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/events/[id]", e);
    return error("Internal server error", 500);
  }
}
