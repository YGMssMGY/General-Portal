import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const task = await db.taskItem.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!task || task.workspaceId !== workspace.id) {
      return error("Task not found", 404);
    }

    const subtasks = await db.subTask.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
    });

    return success(subtasks);
  } catch (e) {
    console.error("GET /api/tasks/[id]/subtasks", e);
    return error("Internal server error", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const task = await db.taskItem.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!task || task.workspaceId !== workspace.id) {
      return error("Task not found", 404);
    }

    const body = await request.json();
    const { title } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return error("Title is required", 400);
    }

    const subtask = await db.subTask.create({
      data: {
        taskId: id,
        title: title.trim(),
      },
    });

    return success(subtask, 201);
  } catch (e) {
    console.error("POST /api/tasks/[id]/subtasks", e);
    return error("Internal server error", 500);
  }
}
