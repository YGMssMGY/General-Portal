import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { assetLoans } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ loanId: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const loanId = requireUuid((await params).loanId, "loanId");
        const loan = await t.db.query.assetLoans.findFirst({
            where: eq(assetLoans.id, loanId),
            with: { asset: true, user: { columns: { id: true, name: true } } },
        });
        if (!loan || !loan.asset || loan.asset.workspaceId !== t.workspaceId) {
            throw new ApiError("Loan not found", 404);
        }
        const canManage = t.permissions.includes("manage_assets");
        if (loan.userId !== t.userId && !canManage) throw new ApiError("Forbidden", 403);
        if (loan.returnedAt || loan.status === "returned") {
            throw new ApiError("Loan has already been returned", 409);
        }
        const [updated] = await t.db
            .update(assetLoans)
            .set({ returnedAt: new Date(), status: "returned" })
            .where(eq(assetLoans.id, loanId))
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "returned",
            entityType: "asset_loan",
            entityId: loanId,
            metadata: { assetId: loan.assetId, name: loan.asset.name },
            ipAddress: clientIp(request),
        });
        return ok(updated);
    } catch (e) {
        return handleRouteError("POST /api/assets/loans/[loanId]/return", e);
    }
}
