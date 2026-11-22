import { NextRequest } from "next/server";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { transactions } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "view_reports",
            module: "finance",
        });

        const now = new Date();
        const buckets: string[] = [];
        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
        }
        const since = new Date(now.getFullYear(), now.getMonth() - 23, 1);

        const rows = await t.db
            .select({
                month: sql<string>`to_char(date_trunc('month', ${transactions.date}), 'YYYY-MM')`,
                income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amountCents} else 0 end), 0)::text`,
                expense: sql<string>`coalesce(sum(case when ${transactions.type} <> 'income' then ${transactions.amountCents} else 0 end), 0)::text`,
            })
            .from(transactions)
            .where(
                and(
                    eq(transactions.workspaceId, t.workspaceId),
                    isNull(transactions.deletedAt),
                    gte(transactions.date, since),
                ),
            )
            .groupBy(sql`date_trunc('month', ${transactions.date})`)
            .orderBy(sql`date_trunc('month', ${transactions.date})`);

        const byKey = new Map(
            rows.map((r) => [r.month, { income: Number(r.income), expense: Number(r.expense) }]),
        );
        const months = buckets.map((key) => {
            const income = byKey.get(key)?.income ?? 0;
            const expense = byKey.get(key)?.expense ?? 0;
            return { month: key, income, expense, net: income - expense };
        });

        return ok({ months });
    } catch (e) {
        return handleRouteError("GET /api/finance/trends", e);
    }
}
