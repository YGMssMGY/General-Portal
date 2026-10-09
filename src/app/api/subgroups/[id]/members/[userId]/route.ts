import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { subgroupMemberships, subgroups } from "@/db/schema";
import { ApiError, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { id, userId } = await params;
        const subgroupId = requireUuid(id);
        const targetUserId = requireUuid(userId, "userId");

        const sg = await t.db.query.subgroups.findFirst({
            where: and(
                eq(subgroups.id, subgroupId),
                eq(subgroups.workspaceId, t.workspaceId),
                isNull(subgroups.deletedAt),
            ),
            columns: { id: true, name: true },
        });
        if (!sg) throw new ApiError("Subgroup not found", 404);

        if (targetUserId !== t.userId && !t.permissions.includes("manage_subgroups")) {
            throw new ApiError("Forbidden", 403);
        }

        const membership = await t.db.query.subgroupMemberships.findFirst({
            where: and(
                eq(subgroupMemberships.subgroupId, subgroupId),
                eq(subgroupMemberships.userId, targetUserId),
            ),
            columns: { id: true },
        });
        if (!membership) throw new ApiError("Membership not found", 404);

        await t.db.delete(subgroupMemberships).where(eq(subgroupMemberships.id, membership.id));

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "remove_member",
                entityType: "subgroup",
                entityId: subgroupId,
                metadata: { removedUserId: targetUserId, subgroupName: sg.name },
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/subgroups/[id]/members/[userId]", e);
    }
}
