import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const { id } = await params;

    const meeting = await db.meeting.findUnique({ where: { id } });
    if (!meeting) return error("Meeting not found", 404);

    const rsvps = await db.meetingRsvp.findMany({
      where: { meetingId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const data = rsvps.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      user: r.user,
    }));

    return success(data);
  } catch (e) {
    console.error("GET /api/meetings/[id]/rsvps", e);
    return error("Internal server error", 500);
  }
}
