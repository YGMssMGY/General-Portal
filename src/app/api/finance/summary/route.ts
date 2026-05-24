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

    const [incomeAgg, expenseAgg, categoryGroups, transactionCount] =
      await Promise.all([
        db.transaction.aggregate({
          _sum: { amount: true },
          where: { workspaceId: workspace.id, type: "income" },
        }),
        db.transaction.aggregate({
          _sum: { amount: true },
          where: { workspaceId: workspace.id, type: "expense" },
        }),
        db.transaction.groupBy({
          by: ["category", "type"],
          where: { workspaceId: workspace.id, category: { not: null } },
          _sum: { amount: true },
          _count: true,
        }),
        db.transaction.count({
          where: { workspaceId: workspace.id },
        }),
      ]);

    const totalIncome = Number(incomeAgg._sum.amount ?? 0);
    const totalExpense = Number(expenseAgg._sum.amount ?? 0);

    const categoryBreakdown = categoryGroups.map((g) => ({
      category: g.category,
      total: Number(g._sum.amount ?? 0),
      count: g._count,
    }));

    return success({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount,
      categoryBreakdown,
    });
  } catch (e) {
    console.error("GET /api/finance/summary", e);
    return error("Internal server error", 500);
  }
}
