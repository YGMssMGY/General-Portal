import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const slots = await db.volunteerSlot.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { startTime: "asc" },
      skip,
      take: limit,
      include: {
        _count: { select: { signups: true } },
        signups: {
          where: { userId: session.user.id },
          select: { id: true },
        },
      },
    });

    const data = slots.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      signedUp: s._count.signups,
      userSignedUp: s.signups.length > 0,
    }));

    return success(data);
  } catch (e) {
    console.error("GET /api/volunteers", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { title, description, startTime, endTime, capacity } = body;

    if (!title?.trim() || !startTime || !endTime) {
      return error("Title, startTime, and endTime are required", 400);
    }

    const slot = await db.volunteerSlot.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        description: description ?? null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        capacity: capacity ?? 1,
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "created",
        entityType: "volunteer_slot",
        entityId: slot.id,
        metadata: { title: slot.title },
      },
    });

    return success(slot, 201);
  } catch (e) {
    console.error("POST /api/volunteers", e);
    return error("Internal server error", 500);
  }
}
