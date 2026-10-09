import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { proposals } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "approve_proposal",
            module: "proposals",
        });
        const id = requireUuid((await params).id);
        const proposal = await t.db.query.proposals.findFirst({
            where: and(
                eq(proposals.id, id),
                eq(proposals.workspaceId, t.workspaceId),
                isNull(proposals.deletedAt),
            ),
        });
        if (!proposal) throw new ApiError("Proposal not found", 404);
        if (proposal.status !== "pending")
            throw new ApiError("Only pending proposals can be rejected", 400);

        const [updated] = await Promise.all([
            t.db
                .update(proposals)
                .set({ status: "rejected", updatedAt: new Date() })
                .where(
                    and(
                        eq(proposals.id, id),
                        eq(proposals.workspaceId, t.workspaceId),
                        isNull(proposals.deletedAt),
                    ),
                )
                .returning()
                .then((rows) => rows[0]),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "reject",
                entityType: "proposal",
                entityId: id,
                metadata: { title: proposal.title },
                ipAddress: clientIp(request),
            }),
        ]);
        if (!updated) throw new ApiError("Proposal not found", 404);
        return ok(updated);
    } catch (e) {
        return handleRouteError("POST /api/proposals/[id]/reject", e);
    }
}
