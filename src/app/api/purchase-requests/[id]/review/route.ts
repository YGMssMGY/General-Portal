import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { purchaseRequests } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";

function body<T>(schema: {
    safeParse: (
        v: unknown,
    ) =>
        | { success: true; data: T }
        | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
}) {
    return {
        safeParse: (v: unknown) => {
            const r = schema.safeParse(v);
            if (r.success) return { success: true as const, data: r.data };
            return {
                success: false as const,
                error: {
                    issues: r.error.issues.map((i) => ({
                        path: i.path.filter(
                            (p): p is string | number =>
                                typeof p === "string" || typeof p === "number",
                        ),
                        message: i.message,
                    })),
                },
            };
        },
    };
}

const reviewSchema = z.object({
    status: z.enum(["approved", "rejected"]),
    reviewComment: z.string().trim().max(2000).nullish(),
});

const withCost = <T extends { costCents: number }>(r: T) => ({ ...r, cost: r.costCents / 100 });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_purchase_requests",
            module: "finance",
        });
        const { id } = await params;
        const requestId = requireUuid(id);
        const data = await parseBody(body(reviewSchema), request);

        const existing = await t.db.query.purchaseRequests.findFirst({
            where: and(
                eq(purchaseRequests.id, requestId),
                eq(purchaseRequests.workspaceId, t.workspaceId),
                isNull(purchaseRequests.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Purchase request not found", 404);
        if (!["submitted", "under_review"].includes(existing.status)) {
            throw new ApiError(
                "Purchase request must be in submitted or under_review status to review",
                400,
            );
        }

        const [updated] = await t.db
            .update(purchaseRequests)
            .set({
                status: data.status,
                reviewedById: t.userId,
                reviewComment: data.reviewComment ?? null,
                updatedAt: new Date(),
            })
            .where(eq(purchaseRequests.id, requestId))
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: data.status === "approved" ? "approved" : "rejected",
            entityType: "purchase_request",
            entityId: requestId,
            metadata: {
                title: existing.title,
                itemName: existing.itemName,
                previousStatus: existing.status,
                reviewComment: data.reviewComment ?? null,
            },
            ipAddress: clientIp(request),
        });

        return ok(withCost(updated));
    } catch (e) {
        return handleRouteError("POST /api/purchase-requests/[id]/review", e);
    }
}
