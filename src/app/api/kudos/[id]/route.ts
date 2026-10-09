import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { kudos } from "@/db/schema";
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
        requireUuid(id);

        const existing = await t.db.query.kudos.findFirst({
            where: and(eq(kudos.id, id), eq(kudos.workspaceId, t.workspaceId)),
        });
        if (!existing) throw new ApiError("Kudos not found", 404);
        if (existing.senderId !== t.userId && !t.permissions.includes("manage_users")) {
            throw new ApiError("Forbidden", 403);
        }

        await Promise.all([
            t.db.delete(kudos).where(eq(kudos.id, id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "delete",
                entityType: "kudos",
                entityId: id,
                metadata: { receiverId: existing.receiverId },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/kudos/[id]", e);
    }
}
