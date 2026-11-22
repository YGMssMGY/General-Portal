import { NextRequest } from "next/server";
import { and, count, eq, isNotNull, isNull, sum } from "drizzle-orm";
import { transactions } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "view_reports", module: "finance" });

        const groups = await t.db
            .select({
                category: transactions.category,
                type: transactions.type,
                total: sum(transactions.amountCents),
                n: count(),
            })
            .from(transactions)
            .where(
                and(
                    eq(transactions.workspaceId, t.workspaceId),
                    isNull(transactions.deletedAt),
                    isNotNull(transactions.category),
                ),
            )
            .groupBy(transactions.category, transactions.type);

        let totalIncome = 0;
        let totalExpense = 0;
        let transactionCount = 0;
        const categoryBreakdown = groups.map((g) => {
            const total = Number(g.total ?? 0);
            transactionCount += g.n;
            if (g.type === "income") totalIncome += total;
            else totalExpense += total;
            return { category: g.category, type: g.type, total, count: g.n };
        });

        return ok({
            totalIncome,
            totalExpense,
            balance: totalIncome - totalExpense,
            transactionCount,
            categoryBreakdown,
        });
    } catch (e) {
        return handleRouteError("GET /api/finance/summary", e);
    }
}
