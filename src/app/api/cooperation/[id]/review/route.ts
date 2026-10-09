import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { cooperationRequests } from "@/db/schema";
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
    status: z.enum(["pending", "under_review", "approved", "rejected"]),
    reviewComment: z.string().trim().max(2000).nullish(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_partnerships",
            module: "partnerships",
        });
        const { id } = await params;
        const requestId = requireUuid(id);
        const data = await parseBody(body(reviewSchema), request);

        const existing = await t.db.query.cooperationRequests.findFirst({
            where: and(
                eq(cooperationRequests.id, requestId),
                eq(cooperationRequests.workspaceId, t.workspaceId),
                isNull(cooperationRequests.deletedAt),
            ),
        });
        if (!existing) throw new ApiError("Cooperation request not found", 404);

        const [updated] = await t.db
            .update(cooperationRequests)
            .set({ status: data.status, reviewedById: t.userId, updatedAt: new Date() })
            .where(eq(cooperationRequests.id, requestId))
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "reviewed",
            entityType: "cooperation_request",
            entityId: requestId,
            metadata: {
                status: data.status,
                previousStatus: existing.status,
                reviewComment: data.reviewComment ?? null,
            },
            ipAddress: clientIp(request),
        });

        return ok(updated);
    } catch (e) {
        return handleRouteError("POST /api/cooperation/[id]/review", e);
    }
}
