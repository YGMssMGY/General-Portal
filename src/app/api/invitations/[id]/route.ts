import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { invitations } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_users",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.invitations.findFirst({
            where: and(eq(invitations.id, id), eq(invitations.workspaceId, t.workspaceId)),
        });
        if (!existing) throw new ApiError("Invitation not found", 404);
        await t.db
            .update(invitations)
            .set({ revokedAt: new Date() })
            .where(
                and(
                    eq(invitations.id, id),
                    eq(invitations.workspaceId, t.workspaceId),
                    isNull(invitations.revokedAt),
                ),
            );
        return ok({ revoked: true });
    } catch (e) {
        return handleRouteError("DELETE /api/invitations/[id]", e);
    }
}
