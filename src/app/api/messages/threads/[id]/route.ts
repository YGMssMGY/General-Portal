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

    const thread = await db.messageThread.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: { select: { id: true, name: true, image: true } },
            readBy: {
              where: { userId: session.user.id },
              select: { readAt: true },
            },
          },
        },
      },
    });

    if (!thread) return error("Thread not found", 404);

    const data = {
      id: thread.id,
      subject: thread.subject,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      messages: thread.messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.sender,
        read: m.readBy.length > 0,
        readAt: m.readBy[0]?.readAt ?? null,
      })),
    };

    return success(data);
  } catch (e) {
    console.error("GET /api/messages/threads/[id]", e);
    return error("Internal server error", 500);
  }
}
