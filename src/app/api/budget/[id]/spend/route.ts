import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { budgetAllocations, budgetTransactions } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const spendSchema = z.object({
    amount: z.number(),
    description: z.string().trim().nullable().optional(),
});
type SpendInput = z.infer<typeof spendSchema>;

function toCents(v: unknown): number {
    if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new ApiError("Amount must be a finite number", 400);
    }
    if (v < 0) throw new ApiError("Amount must be non-negative", 400);
    return Math.round(v * 100);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_budget", module: "budget" });
        const { id } = await params;
        requireUuid(id);

        const body = await parseBody<SpendInput>(spendSchema as never, request);
        const cents = toCents(body.amount);
        if (cents <= 0) throw new ApiError("A positive amount is required", 400);

        const budgetTx = await t.db.transaction(async (tx) => {
            const alloc = await tx.query.budgetAllocations.findFirst({
                where: and(
                    eq(budgetAllocations.id, id),
                    eq(budgetAllocations.workspaceId, t.workspaceId),
                    isNull(budgetAllocations.deletedAt),
                ),
            });
            if (!alloc) throw new ApiError("Budget allocation not found", 404);
            if (alloc.spentCents + cents > alloc.amountCents) {
                throw new ApiError(
                    `Insufficient remaining budget. Available: ${((alloc.amountCents - alloc.spentCents) / 100).toFixed(2)}`,
                    400,
                );
            }
            const [bt] = await tx
                .insert(budgetTransactions)
                .values({
                    id: randomUUID(),
                    allocationId: id,
                    amountCents: cents,
                    type: "expense",
                    description: body.description?.trim() || null,
                    decidedById: t.userId,
                })
                .returning();
            await tx
                .update(budgetAllocations)
                .set({ spentCents: alloc.spentCents + cents, updatedAt: new Date() })
                .where(eq(budgetAllocations.id, id));
            return bt;
        });

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "record_spend",
            entityType: "budget_transaction",
            entityId: budgetTx.id,
            metadata: { allocationId: id, amountCents: cents },
            ipAddress: clientIp(request),
        });

        return ok(budgetTx, 201);
    } catch (e) {
        return handleRouteError("POST /api/budget/[id]/spend", e);
    }
}
