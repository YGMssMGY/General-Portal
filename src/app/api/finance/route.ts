import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where: { workspaceId: workspace.id },
        orderBy: { date: "desc" },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true, image: true } },
        },
      }),
      db.transaction.count({ where: { workspaceId: workspace.id } }),
    ]);

    const data = transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    }));

    return success({
      transactions: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("GET /api/finance", e);
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
        description: description ?? null,
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
    console.error("POST /api/finance", e);
    return error("Internal server error", 500);
  }
}
