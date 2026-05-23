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
    const portal = (session.user as any).portal;
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

    const comments = await db.taskComment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return success(comments);
  } catch (e) {
    console.error("GET /api/tasks/[id]/comments", e);
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
    const portal = (session.user as any).portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const task = await db.taskItem.findUnique({
      where: { id },
      select: { workspaceId: true, title: true },
    });
    if (!task || task.workspaceId !== workspace.id) {
      return error("Task not found", 404);
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return error("Content is required", 400);
    }

    const comment = await db.taskComment.create({
      data: {
        taskId: id,
        userId: session.user.id,
        content: content.trim(),
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "commented",
        entityType: "task",
        entityId: id,
        metadata: { title: task.title },
      },
    });

    return success(comment, 201);
  } catch (e) {
    console.error("POST /api/tasks/[id]/comments", e);
    return error("Internal server error", 500);
  }
}
