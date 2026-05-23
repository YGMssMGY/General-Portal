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

    const task = await db.taskItem.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, name: true, email: true, image: true } },
        subtasks: { orderBy: { createdAt: "asc" } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    if (!task || task.workspaceId !== workspace.id) {
      return error("Task not found", 404);
    }

    return success(task);
  } catch (e) {
    console.error("GET /api/tasks/[id]", e);
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

    const existing = await db.taskItem.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Task not found", 404);
    }

    const body = await request.json();
    const { title, description, status, priority, dueDate, assigneeId } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status !== undefined) data.status = status;
    if (priority !== undefined) data.priority = priority;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) data.assigneeId = assigneeId || null;

    if (Object.keys(data).length === 0) {
      return error("No fields to update", 400);
    }

    const task = await db.taskItem.update({ where: { id }, data });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "update",
        entityType: "task",
        entityId: id,
        metadata: { changes: data },
      },
      db,
    );

    return success(task);
  } catch (e) {
    console.error("PUT /api/tasks/[id]", e);
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

    const existing = await db.taskItem.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Task not found", 404);
    }

    await db.taskItem.delete({ where: { id } });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "delete",
        entityType: "task",
        entityId: id,
        metadata: { title: existing.title },
      },
      db,
    );

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/tasks/[id]", e);
    return error("Internal server error", 500);
  }
}
