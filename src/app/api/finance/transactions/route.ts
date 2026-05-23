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

    const transactions = await db.transaction.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { date: "desc" },
      take: 20,
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
      },
    });

    const transactionIds = transactions.map((t) => t.id);

    const attachmentCounts = await db.attachment.groupBy({
      by: ["entityId"],
      where: {
        entityType: "transaction",
        entityId: { in: transactionIds },
      },
      _count: true,
    });

    const countMap = Object.fromEntries(
      attachmentCounts.map((a) => [a.entityId, a._count]),
    );

    const data = transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
      attachmentCount: countMap[t.id] ?? 0,
    }));

    return success(data);
  } catch (e) {
    console.error("GET /api/finance/transactions", e);
    return error("Internal server error", 500);
  }
}
