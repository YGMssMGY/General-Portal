import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

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
    const now = new Date();
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth()), 10);
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);

    if (month < 0 || month > 11 || isNaN(month) || isNaN(year)) {
      return error("Invalid month or year", 400);
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const items: Array<{
      id: string;
      title: string;
      date: string;
      type: "event" | "deadline" | "meeting";
      portal: string;
      entityId: string;
    }> = [];

    const [events, tasks, meetings] = await Promise.all([
      db.eventItem.findMany({
        where: {
          workspaceId: workspace.id,
          status: "published",
          startDate: { gte: startDate, lte: endDate },
        },
        select: { id: true, title: true, startDate: true },
      }),
      db.taskItem.findMany({
        where: {
          workspaceId: workspace.id,
          dueDate: { gte: startDate, lte: endDate },
          status: { not: "done" },
        },
        select: { id: true, title: true, dueDate: true },
      }),
      db.meeting.findMany({
        where: {
          workspaceId: workspace.id,
          startTime: { gte: startDate, lte: endDate },
        },
        select: { id: true, title: true, startTime: true },
      }),
    ]);

    for (const event of events) {
      items.push({
        id: event.id,
        title: event.title,
        date: event.startDate.toISOString(),
        type: "event",
        portal,
        entityId: event.id,
      });
    }

    for (const task of tasks) {
      items.push({
        id: task.id,
        title: `[Task] ${task.title}`,
          date: task.dueDate ? task.dueDate.toISOString() : new Date().toISOString(),
        type: "deadline",
        portal,
        entityId: task.id,
      });
    }

    for (const meeting of meetings) {
      items.push({
        id: meeting.id,
        title: `[Meeting] ${meeting.title}`,
        date: meeting.startTime.toISOString(),
        type: "meeting",
        portal,
        entityId: meeting.id,
      });
    }

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return success({ items, month, year });
  } catch (e) {
    console.error("GET /api/calendar", e);
    return error("Internal server error", 500);
  }
}
