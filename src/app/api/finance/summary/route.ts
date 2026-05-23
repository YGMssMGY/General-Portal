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
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap: Record<string, { total: number; count: number }> = {};

    for (const t of transactions) {
      const amt = Number(t.amount);
      if (t.type === "income") totalIncome += amt;
      else totalExpense += amt;

      if (t.category) {
        if (!categoryMap[t.category]) {
          categoryMap[t.category] = { total: 0, count: 0 };
        }
        categoryMap[t.category].total += amt;
        categoryMap[t.category].count += 1;
      }
    }

    const categoryBreakdown = Object.entries(categoryMap).map(
      ([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
      }),
    );

    return success({
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionCount: transactions.length,
      categoryBreakdown,
    });
  } catch (e) {
    console.error("GET /api/finance/summary", e);
    return error("Internal server error", 500);
  }
}
