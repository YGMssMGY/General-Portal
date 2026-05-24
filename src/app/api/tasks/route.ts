import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import type { TaskStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as TaskStatus | null;
    const assigneeId = searchParams.get("assigneeId");
    const priority = searchParams.get("priority");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (status && ["todo", "in_progress", "done"].includes(status)) {
      where.status = status;
    }
    if (assigneeId) where.assigneeId = assigneeId;
    if (priority) where.priority = parseInt(priority, 10);

    const tasks = await db.taskItem.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } },
        assignee: { select: { id: true, name: true, email: true, image: true } },
        subtasks: { orderBy: { createdAt: "asc" } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
    });

    return success(tasks);
  } catch (e) {
    console.error("GET /api/tasks", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, description, priority, dueDate, assigneeId } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return error("Title is required", 400);
    }

    const task = await db.taskItem.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        description: description?.trim() ?? null,
        priority: typeof priority === "number" ? priority : 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assigneeId ?? null,
        createdById: session.user.id,
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "created",
        entityType: "task",
        entityId: task.id,
        metadata: { title: task.title },
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create",
        entityType: "task",
        entityId: task.id,
        metadata: { title: task.title },
      },
      db,
    );

    return success(task, 201);
  } catch (e) {
    console.error("POST /api/tasks", e);
    return error("Internal server error", 500);
  }
}
