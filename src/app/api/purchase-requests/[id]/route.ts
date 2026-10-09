import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { purchaseRequests } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

const withCost = <T extends { costCents: number }>(r: T) => ({ ...r, cost: r.costCents / 100 });

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "finance" });
        const { id } = await params;
        const requestId = requireUuid(id);

        const row = await t.db.query.purchaseRequests.findFirst({
            where: and(
                eq(purchaseRequests.id, requestId),
                eq(purchaseRequests.workspaceId, t.workspaceId),
                isNull(purchaseRequests.deletedAt),
            ),
            with: {
                submittedBy: { columns: { id: true, name: true, email: true, image: true } },
                reviewedBy: { columns: { id: true, name: true, image: true } },
            },
        });
        if (!row) throw new ApiError("Purchase request not found", 404);

        return ok(withCost(row));
    } catch (e) {
        return handleRouteError("GET /api/purchase-requests/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "finance" });
        const { id } = await params;
        const requestId = requireUuid(id);

        const existing = await t.db.query.purchaseRequests.findFirst({
            where: and(
                eq(purchaseRequests.id, requestId),
                eq(purchaseRequests.workspaceId, t.workspaceId),
                isNull(purchaseRequests.deletedAt),
            ),
            columns: { id: true, title: true, submittedById: true },
        });
        if (!existing) throw new ApiError("Purchase request not found", 404);

        if (
            existing.submittedById !== t.userId &&
            !t.permissions.includes("manage_purchase_requests")
        ) {
            throw new ApiError("Only the submitter or a manager can delete this request", 403);
        }

        const permanent = request.nextUrl.searchParams.get("permanent") === "true";
        const hard = permanent && t.roleName === "admin";
        if (hard) {
            await t.db.delete(purchaseRequests).where(eq(purchaseRequests.id, requestId));
        } else {
            await t.db
                .update(purchaseRequests)
                .set({ deletedAt: new Date(), updatedAt: new Date() })
                .where(eq(purchaseRequests.id, requestId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: hard ? "delete_permanent" : "delete",
                entityType: "purchase_request",
                entityId: requestId,
                metadata: { title: existing.title },
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/purchase-requests/[id]", e);
    }
}
