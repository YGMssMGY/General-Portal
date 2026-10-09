import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { budgetAllocations } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_budget", module: "budget" });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.budgetAllocations.findFirst({
            where: and(
                eq(budgetAllocations.id, id),
                eq(budgetAllocations.workspaceId, t.workspaceId),
                isNull(budgetAllocations.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Budget allocation not found", 404);

        const [[updated]] = await Promise.all([
            t.db
                .update(budgetAllocations)
                .set({ status: "active", updatedAt: new Date() })
                .where(eq(budgetAllocations.id, id))
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "approve_budget_allocation",
                entityType: "budget_allocation",
                entityId: id,
                metadata: { category: existing.category },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(updated);
    } catch (e) {
        return handleRouteError("POST /api/budget/[id]/approve", e);
    }
}
