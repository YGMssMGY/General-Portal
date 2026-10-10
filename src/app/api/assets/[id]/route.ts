import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { assetLoans, assets } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const updateAssetSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    quantity: z.number().int().min(1).max(100000).optional(),
    condition: z.string().trim().max(64).optional(),
});
type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_assets", module: "members" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.assets.findFirst({
            where: and(
                eq(assets.id, id),
                eq(assets.workspaceId, t.workspaceId),
                isNull(assets.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Asset not found", 404);
        const body = await parseBody<UpdateAssetInput>(updateAssetSchema as never, request);
        const set: Partial<typeof assets.$inferInsert> = {};
        if (body.name !== undefined) set.name = body.name;
        if (body.description !== undefined) set.description = body.description;
        if (body.quantity !== undefined) set.quantity = body.quantity;
        if (body.condition !== undefined) set.condition = body.condition;
        if (Object.keys(set).length === 0) throw new ApiError("No fields to update", 400);
        const [updated] = await t.db.update(assets).set(set).where(eq(assets.id, id)).returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "updated",
            entityType: "asset",
            entityId: id,
            metadata: { changes: Object.keys(set) },
            ipAddress: clientIp(request),
        });
        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/assets/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { permission: "manage_assets", module: "members" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.assets.findFirst({
            where: and(
                eq(assets.id, id),
                eq(assets.workspaceId, t.workspaceId),
                isNull(assets.deletedAt),
            ),
            columns: { id: true, name: true },
        });
        if (!existing) throw new ApiError("Asset not found", 404);
        const active = await t.db.query.assetLoans.findFirst({
            where: and(eq(assetLoans.assetId, id), isNull(assetLoans.returnedAt)),
            columns: { id: true },
        });
        if (active) throw new ApiError("Cannot delete asset with active loans", 409);
        await Promise.all([
            t.db.update(assets).set({ deletedAt: new Date() }).where(eq(assets.id, id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "deleted",
                entityType: "asset",
                entityId: id,
                metadata: { name: existing.name },
                ipAddress: clientIp(request),
            }),
        ]);
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/assets/[id]", e);
    }
}
