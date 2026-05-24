import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function POST(
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

    const body = await request.json();
    const { status } = body;

    if (status === null) {
      await db.meetingRsvp.deleteMany({
        where: { meetingId: id, userId: session.user.id },
      });
      return success({ removed: true });
    }

    if (!["accepted", "declined", "maybe"].includes(status)) {
      return error("Status must be accepted, declined, maybe, or null to remove", 400);
    }

    const rsvp = await db.meetingRsvp.upsert({
      where: { meetingId_userId: { meetingId: id, userId: session.user.id } },
      update: { status },
      create: { meetingId: id, userId: session.user.id, status },
    });

    return success(rsvp);
  } catch (e) {
    console.error("POST /api/meetings/[id]/rsvp", e);
    return error("Internal server error", 500);
  }
}
