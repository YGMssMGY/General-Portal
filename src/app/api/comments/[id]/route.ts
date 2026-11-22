import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { comments } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { id } = await params;
        requireUuid(id, "id");

        const comment = await t.db.query.comments.findFirst({
            where: and(
                eq(comments.id, id),
                eq(comments.workspaceId, t.workspaceId),
                isNull(comments.deletedAt),
            ),
        });
        if (!comment) throw new ApiError("Comment not found", 404);
        if (comment.userId !== t.userId && !t.permissions.includes("manage_all_tasks")) {
            throw new ApiError("Forbidden", 403);
        }

        await Promise.all([
            t.db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "comment",
                entityId: id,
                metadata: { targetType: comment.entityType, targetId: comment.entityId },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/comments/[id]", e);
    }
}
