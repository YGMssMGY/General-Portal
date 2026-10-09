import { NextRequest } from "next/server";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { transactions } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "finance" });
        const searchParams = new URL(request.url).searchParams;
        const rawTake = Number.parseInt(searchParams.get("limit") ?? "500", 10);
        const take = Math.min(500, Math.max(1, Number.isFinite(rawTake) ? rawTake : 500));

        const now = new Date();
        const buckets: { key: string; income: number; expense: number }[] = [];
        for (let i = 23; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({
                key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                income: 0,
                expense: 0,
            });
        }
        const since = new Date(now.getFullYear(), now.getMonth() - 23, 1);

        const rows = await t.db
            .select({
                amountCents: transactions.amountCents,
                date: transactions.date,
                type: transactions.type,
            })
            .from(transactions)
            .where(
                and(
                    eq(transactions.workspaceId, t.workspaceId),
                    isNull(transactions.deletedAt),
                    gte(transactions.date, since),
                ),
            )
            .orderBy(desc(transactions.date))
            .limit(take);

        const byKey = new Map(buckets.map((b) => [b.key, b]));
        for (const r of rows) {
            const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, "0")}`;
            const b = byKey.get(key);
            if (!b) continue;
            if (r.type === "income") b.income += r.amountCents;
            else b.expense += r.amountCents;
        }

        return ok({
            months: buckets.map((b) => ({
                month: b.key,
                income: b.income,
                expense: b.expense,
                net: b.income - b.expense,
            })),
        });
    } catch (e) {
        return handleRouteError("GET /api/finance/trends", e);
    }
}
