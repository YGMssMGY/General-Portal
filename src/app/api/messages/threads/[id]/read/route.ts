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

    const thread = await db.messageThread.findUnique({ where: { id } });
    if (!thread) return error("Thread not found", 404);

    const unreadMessages = await db.message.findMany({
      where: {
        threadId: id,
        readBy: { none: { userId: session.user.id } },
      },
      select: { id: true },
    });

    if (unreadMessages.length > 0) {
      await db.messageRead.createMany({
        data: unreadMessages.map((m) => ({
          messageId: m.id,
          userId: session.user.id,
        })),
        skipDuplicates: true,
      });
    }

    return success({ markedAsRead: unreadMessages.length });
  } catch (e) {
    console.error("POST /api/messages/threads/[id]/read", e);
    return error("Internal server error", 500);
  }
}
