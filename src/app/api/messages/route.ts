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

    const threads = await db.messageThread.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, image: true } },
          },
        },
        _count: { select: { messages: true } },
      },
    });

    const threadIds = threads.map((t) => t.id);

    const messageReads = await db.messageRead.findMany({
      where: {
        userId: session.user.id,
        message: { threadId: { in: threadIds } },
      },
      include: { message: { select: { threadId: true } } },
    });

    const readPerThread: Record<string, Set<string>> = {};
    for (const mr of messageReads) {
      if (!readPerThread[mr.message.threadId]) {
        readPerThread[mr.message.threadId] = new Set();
      }
      readPerThread[mr.message.threadId].add(mr.messageId);
    }

    const data = threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastMessage: t.messages[0] ?? null,
      totalMessages: t._count.messages,
      unreadCount:
        t._count.messages - (readPerThread[t.id]?.size ?? 0),
    }));

    return success(data);
  } catch (e) {
    console.error("GET /api/messages", e);
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
    const { subject, content, recipientIds } = body;
    const finalSubject = subject?.trim() || "New conversation";
    if (!content?.trim()) {
      return error("Content is required", 400);
    }

    const thread = await db.messageThread.create({
      data: {
        workspaceId: workspace.id,
        subject: finalSubject,
        messages: {
          create: {
            senderId: session.user.id,
            content: content.trim(),
          },
        },
      },
      include: {
        messages: {
          include: {
            sender: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });

    if (recipientIds && Array.isArray(recipientIds) && recipientIds.length > 0) {
      const messageId = thread.messages[0]?.id;
      if (messageId) {
        await db.messageRead.createMany({
          data: recipientIds
            .filter((rid: string) => rid !== session.user.id)
            .map((rid: string) => ({
              messageId,
              userId: rid,
              readAt: new Date(),
            })),
          skipDuplicates: true,
        });
      }
    }

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "created",
        entityType: "message_thread",
        entityId: thread.id,
        metadata: { subject: finalSubject },
      },
    });

    return success(thread, 201);
  } catch (e) {
    console.error("POST /api/messages", e);
    return error("Internal server error", 500);
  }
}
