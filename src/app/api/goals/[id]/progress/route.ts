import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { goals, keyResults } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";
import { goalProgress } from "@/app/api/goals/route";

const progressSchema = z.object({
    keyResultId: z.string().uuid(),
    current: z.number().int().min(0).max(1000000000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const goal = await t.db.query.goals.findFirst({
            where: and(
                eq(goals.id, id),
                eq(goals.workspaceId, t.workspaceId),
                isNull(goals.deletedAt),
            ),
            with: { keyResults: true },
        });
        if (!goal) throw new ApiError("Goal not found", 404);
        if (goal.ownerId !== t.userId && !t.permissions.includes("manage_goals")) {
            throw new ApiError("Forbidden", 403);
        }
        const data = await parseBody(progressSchema as never, request);
        const body = data as z.infer<typeof progressSchema>;
        const kr = goal.keyResults.find((k) => k.id === body.keyResultId);
        if (!kr) throw new ApiError("Key result not found", 404);
        const updated = await t.db
            .update(keyResults)
            .set({ current: body.current })
            .where(eq(keyResults.id, body.keyResultId))
            .returning();
        const next = goal.keyResults.map((k) =>
            k.id === body.keyResultId ? { target: k.target, current: body.current } : k,
        );
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "progress",
            entityType: "goal",
            entityId: id,
            metadata: { keyResultId: body.keyResultId, current: body.current },
            ipAddress: clientIp(request),
        });
        return ok({ keyResult: updated[0], progress: goalProgress(next) }, 201);
    } catch (e) {
        return handleRouteError("POST /api/goals/[id]/progress", e);
    }
}
