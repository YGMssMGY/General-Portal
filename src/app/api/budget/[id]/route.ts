import { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { budgetAllocations, budgetTransactions } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const updateAllocationSchema = z.object({
    category: z.string().trim().min(1).optional(),
    amount: z.number().optional(),
    fiscalYear: z.number().int().optional(),
    description: z.string().trim().nullable().optional(),
    status: z.enum(["active", "spent", "reconciled"]).optional(),
});
type UpdateAllocationInput = z.infer<typeof updateAllocationSchema>;

function toCents(v: unknown): number {
    if (typeof v !== "number" || !Number.isFinite(v)) {
        throw new ApiError("Amount must be a finite number", 400);
    }
    if (v < 0) throw new ApiError("Amount must be non-negative", 400);
    return Math.round(v * 100);
}

async function scopedAllocation(t: Awaited<ReturnType<typeof requireTenant>>, id: string) {
    const row = await t.db.query.budgetAllocations.findFirst({
        where: and(
            eq(budgetAllocations.id, id),
            eq(budgetAllocations.workspaceId, t.workspaceId),
            isNull(budgetAllocations.deletedAt),
        ),
    });
    if (!row) throw new ApiError("Budget allocation not found", 404);
    return row;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "view_reports", module: "budget" });
        const { id } = await params;
        requireUuid(id);

        const allocation = await t.db.query.budgetAllocations.findFirst({
            where: and(
                eq(budgetAllocations.id, id),
                eq(budgetAllocations.workspaceId, t.workspaceId),
                isNull(budgetAllocations.deletedAt),
            ),
            with: {
                transactions: {
                    orderBy: [desc(budgetTransactions.createdAt)],
                    with: { decidedBy: { columns: { id: true, name: true } } },
                },
            },
        });
        if (!allocation) throw new ApiError("Budget allocation not found", 404);

        return ok(allocation);
    } catch (e) {
        return handleRouteError("GET /api/budget/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_budget", module: "budget" });
        const { id } = await params;
        requireUuid(id);
        await scopedAllocation(t, id);

        const body = await parseBody<UpdateAllocationInput>(
            updateAllocationSchema as never,
            request,
        );
        if (!Object.values(body).some((v) => v !== undefined)) {
            throw new ApiError("No fields to update", 400);
        }

        const set: Partial<typeof budgetAllocations.$inferInsert> & { updatedAt: Date } = {
            updatedAt: new Date(),
        };
        if (body.category !== undefined) set.category = body.category;
        if (body.amount !== undefined) set.amountCents = toCents(body.amount);
        if (body.fiscalYear !== undefined) set.fiscalYear = body.fiscalYear;
        if (body.description !== undefined) set.description = body.description?.trim() || null;
        if (body.status !== undefined) set.status = body.status;

        const [[updated]] = await Promise.all([
            t.db.update(budgetAllocations).set(set).where(eq(budgetAllocations.id, id)).returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "budget_allocation",
                entityId: id,
                metadata: { changes: Object.keys(set).filter((k) => k !== "updatedAt") },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/budget/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { permission: "manage_budget", module: "budget" });
        const { id } = await params;
        requireUuid(id);
        const existing = await scopedAllocation(t, id);

        const permanent = new URL(request.url).searchParams.get("permanent") === "true";
        const sideEffect = emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "delete_budget_allocation",
            entityType: "budget_allocation",
            entityId: id,
            metadata: { category: existing.category },
            ipAddress: clientIp(request),
        });
        if (permanent && t.roleName === "admin") {
            await Promise.all([
                t.db.delete(budgetAllocations).where(eq(budgetAllocations.id, id)),
                sideEffect,
            ]);
        } else {
            await Promise.all([
                t.db
                    .update(budgetAllocations)
                    .set({ deletedAt: new Date(), updatedAt: new Date() })
                    .where(eq(budgetAllocations.id, id)),
                sideEffect,
            ]);
        }

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/budget/[id]", e);
    }
}
