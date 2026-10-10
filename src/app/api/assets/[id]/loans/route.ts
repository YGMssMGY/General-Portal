import type { NextRequest } from "next/server";
import { and, desc, eq, isNull, sum } from "drizzle-orm";
import { z } from "zod";
import { assetLoans, assets } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const createLoanSchema = z.object({
    userId: z.string().uuid().optional(),
    quantity: z.number().int().min(1).max(100000).default(1),
    dueAt: z.coerce.date().nullish(),
});
type CreateLoanInput = z.infer<typeof createLoanSchema>;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const asset = await t.db.query.assets.findFirst({
            where: and(
                eq(assets.id, id),
                eq(assets.workspaceId, t.workspaceId),
                isNull(assets.deletedAt),
            ),
            columns: { id: true },
        });
        if (!asset) throw new ApiError("Asset not found", 404);
        const canManage = t.permissions.includes("manage_assets");
        const rows = await t.db.query.assetLoans.findMany({
            where: and(
                eq(assetLoans.assetId, id),
                canManage ? undefined : eq(assetLoans.userId, t.userId),
            ),
            orderBy: [desc(assetLoans.borrowedAt)],
            with: { user: { columns: { id: true, name: true, email: true } } },
        });
        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/assets/[id]/loans", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const body = await parseBody<CreateLoanInput>(createLoanSchema as never, request);
        const asset = await t.db.query.assets.findFirst({
            where: and(
                eq(assets.id, id),
                eq(assets.workspaceId, t.workspaceId),
                isNull(assets.deletedAt),
            ),
        });
        if (!asset) throw new ApiError("Asset not found", 404);
        const canManage = t.permissions.includes("manage_assets");
        const borrowerId = body.userId ?? t.userId;
        if (borrowerId !== t.userId && !canManage) throw new ApiError("Forbidden", 403);
        const sums = await t.db
            .select({ n: sum(assetLoans.quantity) })
            .from(assetLoans)
            .where(and(eq(assetLoans.assetId, id), isNull(assetLoans.returnedAt)));
        const onLoan = Number(sums[0]?.n ?? 0);
        if (asset.quantity - onLoan < body.quantity) {
            throw new ApiError("Not enough items available", 409);
        }
        const [loan] = await t.db
            .insert(assetLoans)
            .values({
                assetId: id,
                userId: borrowerId,
                quantity: body.quantity,
                dueAt: body.dueAt ?? null,
                status: "out",
            })
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "borrowed",
            entityType: "asset_loan",
            entityId: loan.id,
            metadata: { assetId: id, name: asset.name, quantity: loan.quantity },
            ipAddress: clientIp(request),
        });
        return ok(loan, 201);
    } catch (e) {
        return handleRouteError("POST /api/assets/[id]/loans", e);
    }
}
