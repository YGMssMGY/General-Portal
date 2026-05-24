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

    const kudos = await db.kudos.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
    });

    return success(kudos);
  } catch (e) {
    console.error("GET /api/kudos", e);
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
    const { receiverId, message } = body;

    const rId = typeof receiverId === "string" ? receiverId.trim() : "";
    if (!rId) return error("receiverId is required", 400);
    if (rId === session.user.id) return error("You cannot send kudos to yourself", 400);

    const receiver = await db.user.findUnique({ where: { id: rId } });
    if (!receiver) return error("Receiver not found", 404);

    const kudo = await db.kudos.create({
      data: {
        workspaceId: workspace.id,
        senderId: session.user.id,
        receiverId: rId,
        message: message ?? null,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        receiver: { select: { id: true, name: true, image: true } },
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "sent_kudos",
        entityType: "kudos",
        entityId: kudo.id,
        metadata: { receiverId, receiverName: receiver.name },
      },
    });

    return success(kudo, 201);
  } catch (e) {
    console.error("POST /api/kudos", e);
    return error("Internal server error", 500);
  }
}
