import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { memberships, roles } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { requireTenant } from "@/lib/tenant";

const updateMemberSchema = z.object({
    role: z.string().trim().min(1).optional(),
    roleId: z.string().optional(),
});
type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

function scoped(workspaceId: string, userId: string) {
    return and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "view_members", module: "members" });
        const { id } = await params;
        requireUuid(id);

        const membership = await t.db.query.memberships.findFirst({
            where: scoped(t.workspaceId, id),
            with: {
                role: true,
                user: {
                    columns: { id: true, name: true, email: true, image: true, createdAt: true },
                },
            },
        });
        if (!membership) throw new ApiError("Member not found", 404);

        return ok({
            id: membership.user.id,
            name: membership.user.name,
            email: membership.user.email,
            image: membership.user.image,
            role: membership.role?.name ?? "member",
            joinedAt: membership.user.createdAt,
            membershipSince: membership.createdAt,
        });
    } catch (e) {
        return handleRouteError("GET /api/members/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_users", module: "members" });
        const { id } = await params;
        requireUuid(id);

        const membership = await t.db.query.memberships.findFirst({
            where: scoped(t.workspaceId, id),
            with: { role: true },
        });
        if (!membership) throw new ApiError("Member not found", 404);

        const body = await parseBody<UpdateMemberInput>(updateMemberSchema as never, request);

        let roleRow;
        if (body.roleId !== undefined) {
            requireUuid(body.roleId, "roleId");
            roleRow = await t.db.query.roles.findFirst({
                where: and(eq(roles.id, body.roleId), eq(roles.workspaceId, t.workspaceId)),
            });
            if (!roleRow) throw new ApiError("Role not found in this workspace", 400);
        } else if (body.role !== undefined) {
            roleRow = await t.db.query.roles.findFirst({
                where: and(eq(roles.workspaceId, t.workspaceId), eq(roles.name, body.role)),
            });
            if (!roleRow) throw new ApiError("Invalid role", 400);
        } else {
            throw new ApiError("role or roleId is required", 400);
        }

        const [updated] = await t.db
            .update(memberships)
            .set({ roleId: roleRow.id })
            .where(eq(memberships.id, membership.id))
            .returning();
        if (!updated) throw new ApiError("Member not found", 404);

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update_role",
                entityType: "membership",
                entityId: membership.id,
                metadata: {
                    targetUserId: id,
                    oldRole: membership.role?.name ?? null,
                    newRole: roleRow.name,
                },
            },
            t.db,
        );

        return ok({ id, role: roleRow.name });
    } catch (e) {
        return handleRouteError("PUT /api/members/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { permission: "manage_users", module: "members" });
        const { id } = await params;
        requireUuid(id);

        if (id === t.userId) throw new ApiError("Cannot remove yourself", 400);

        const membership = await t.db.query.memberships.findFirst({
            where: scoped(t.workspaceId, id),
        });
        if (!membership) throw new ApiError("Member not found", 404);

        await t.db.delete(memberships).where(eq(memberships.id, membership.id));

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "remove_member",
                entityType: "membership",
                entityId: membership.id,
                metadata: { targetUserId: id },
            },
            t.db,
        );

        return ok({ removed: true });
    } catch (e) {
        return handleRouteError("DELETE /api/members/[id]", e);
    }
}
