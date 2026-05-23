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

    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification) return error("Notification not found", 404);
    if (notification.userId !== session.user.id) {
      return error("You can only mark your own notifications as read", 403);
    }

    await db.notification.update({
      where: { id },
      data: { read: true },
    });

    return success({ read: true });
  } catch (e) {
    console.error("POST /api/notifications/[id]/read", e);
    return error("Internal server error", 500);
  }
}
