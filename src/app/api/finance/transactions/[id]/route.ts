import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { transactions } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { permission: "manage_finance", module: "finance" });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.transactions.findFirst({
            where: and(
                eq(transactions.id, id),
                eq(transactions.workspaceId, t.workspaceId),
                isNull(transactions.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Transaction not found", 404);

        await Promise.all([
            t.db.update(transactions).set({ deletedAt: new Date() }).where(eq(transactions.id, id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "transaction",
                entityId: id,
                metadata: { amountCents: existing.amountCents, type: existing.type },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/finance/transactions/[id]", e);
    }
}
