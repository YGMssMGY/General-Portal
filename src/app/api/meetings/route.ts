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

    const meetings = await db.meeting.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { startTime: "asc" },
      skip,
      take: limit,
      include: {
        _count: { select: { rsvps: true } },
        rsvps: {
          where: { userId: session.user.id },
          select: { status: true },
        },
      },
    });

    const data = meetings.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      startTime: m.startTime,
      endTime: m.endTime,
      location: m.location,
      status: m.status,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      rsvpCount: m._count.rsvps,
      myRsvp: m.rsvps[0]?.status ?? null,
    }));

    return success(data);
  } catch (e) {
    console.error("GET /api/meetings", e);
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
    const { title, description, startTime, endTime, location } = body;

    if (!title?.trim() || !startTime) {
      return error("Title and startTime are required", 400);
    }

    const meeting = await db.meeting.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        description: description ?? null,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        location: location ?? null,
      },
    });

    return success(meeting, 201);
  } catch (e) {
    console.error("POST /api/meetings", e);
    return error("Internal server error", 500);
  }
}
