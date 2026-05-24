import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import type { EventStatus } from "@prisma/client";

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as EventStatus | null;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (status && ["draft", "published", "cancelled"].includes(status)) {
      where.status = status;
    }
    if (from || to) {
      const startDate: Record<string, Date> = {};
      if (from) startDate.gte = new Date(from);
      if (to) startDate.lte = new Date(to);
      where.startDate = startDate;
    }

    const events = await db.eventItem.findMany({
      where,
      orderBy: { startDate: "asc" },
      skip,
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    return success(events);
  } catch (e) {
    console.error("GET /api/events", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, description, startDate, endDate, location, isPublic, status } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return error("Title is required", 400);
    }
    if (!startDate) {
      return error("Start date is required", 400);
    }

    const event = await db.eventItem.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        description: description?.trim() ?? null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location: location ?? null,
        isPublic: isPublic ?? false,
        status: status ?? "draft",
        createdById: session.user.id,
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create",
        entityType: "event",
        entityId: event.id,
        metadata: { title: event.title },
      },
      db,
    );

    return success(event, 201);
  } catch (e) {
    console.error("POST /api/events", e);
    return error("Internal server error", 500);
  }
}
