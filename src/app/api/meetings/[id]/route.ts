import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const { id } = await params;

    const meeting = await db.meeting.findUnique({
      where: { id },
      include: {
        _count: { select: { rsvps: true } },
        rsvps: {
          where: { userId: session.user.id },
          select: { status: true },
        },
      },
    });

    if (!meeting) return error("Meeting not found", 404);

    const data = {
      ...meeting,
      rsvpCount: meeting._count.rsvps,
      myRsvp: meeting.rsvps[0]?.status ?? null,
      _count: undefined,
      rsvps: undefined,
    };

    return success(data);
  } catch (e) {
    console.error("GET /api/meetings/[id]", e);
    return error("Internal server error", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const role = session.user.role;
    if (!hasPermission(role, "manage_meetings")) return error("Forbidden", 403);

    const db = getDbFromCookie(request);
    const { id } = await params;

    const meeting = await db.meeting.findUnique({ where: { id } });
    if (!meeting) return error("Meeting not found", 404);

    const body = await request.json();
    const { title, description, startTime, endTime, location, status } = body;

    const data = await db.meeting.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description }),
        ...(startTime !== undefined && { startTime: new Date(startTime) }),
        ...(endTime !== undefined && { endTime: endTime ? new Date(endTime) : null }),
        ...(location !== undefined && { location }),
        ...(status !== undefined && { status }),
      },
    });

    return success(data);
  } catch (e) {
    console.error("PUT /api/meetings/[id]", e);
    return error("Internal server error", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const role = session.user.role;
    if (!hasPermission(role, "manage_meetings")) return error("Forbidden", 403);

    const db = getDbFromCookie(request);
    const { id } = await params;

    const meeting = await db.meeting.findUnique({ where: { id } });
    if (!meeting) return error("Meeting not found", 404);

    await db.meeting.delete({ where: { id } });

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/meetings/[id]", e);
    return error("Internal server error", 500);
  }
}
