import { NextRequest } from "next/server";
import { and, eq, isNull, sum } from "drizzle-orm";
import { budgetAllocations } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "budget" });

        const [agg] = await t.db
            .select({
                totalAmount: sum(budgetAllocations.amountCents),
                totalSpent: sum(budgetAllocations.spentCents),
            })
            .from(budgetAllocations)
            .where(
                and(
                    eq(budgetAllocations.workspaceId, t.workspaceId),
                    isNull(budgetAllocations.deletedAt),
                ),
            );

        const totalAllocated = Number(agg?.totalAmount ?? 0);
        const totalSpent = Number(agg?.totalSpent ?? 0);

        return ok({
            totalAllocated,
            totalSpent,
            totalRemaining: totalAllocated - totalSpent,
        });
    } catch (e) {
        return handleRouteError("GET /api/budget/overview", e);
    }
}
