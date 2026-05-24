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

    const body = await request.json();
    const { content } = body;
    if (!content?.trim()) return error("Content is required", 400);

    const message = await db.message.create({
      data: {
        threadId: id,
        senderId: session.user.id,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    await db.messageThread.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return success(message, 201);
  } catch (e) {
    console.error("POST /api/messages/threads/[id]/reply", e);
    return error("Internal server error", 500);
  }
}
