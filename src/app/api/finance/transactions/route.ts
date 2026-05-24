import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { NextRequest } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { amount, type, category, description, date } = body;

    if (amount == null || !type) {
      return error("Amount and type are required", 400);
    }
    if (!["income", "expense"].includes(type)) {
      return error("Type must be income or expense", 400);
    }

    const transaction = await db.transaction.create({
      data: {
        workspaceId: workspace.id,
        amount,
        type,
        category: category ?? null,
        description: description || null,
        date: date ? new Date(date) : new Date(),
        createdById: session.user.id,
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "created",
        entityType: "transaction",
        entityId: transaction.id,
        metadata: { amount: Number(amount), type },
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create_transaction",
        entityType: "transaction",
        entityId: transaction.id,
        metadata: { amount: Number(amount), type, category },
      },
      db,
    );

    return success({ ...transaction, amount: Number(transaction.amount) }, 201);
  } catch (e) {
    console.error("POST /api/finance/transactions", e);
    return error("Internal server error", 500);
  }
}
