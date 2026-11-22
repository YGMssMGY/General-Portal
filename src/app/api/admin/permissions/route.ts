import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { roles } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody } from "@/lib/api";
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from "@/lib/permissions";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const ALL_PERMISSIONS = [
    ...new Set(Object.values(DEFAULT_ROLE_PERMISSIONS).flat()),
] as Permission[];
const SYSTEM_ROLE_NAMES = new Set(["admin", "officer", "member"]);

const updateSchema = z.object({
    roleId: z.uuid(),
    permissions: z.array(z.enum(ALL_PERMISSIONS as [Permission, ...Permission[]])).max(60),
});
type UpdateInput = z.infer<typeof updateSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "view_audit", module: "members" });
        const stored = await t.db
            .select({
                id: roles.id,
                name: roles.name,
                description: roles.description,
                isSystem: roles.isSystem,
                permissions: roles.permissions,
            })
            .from(roles)
            .where(eq(roles.workspaceId, t.workspaceId));
        return ok({
            defaults: DEFAULT_ROLE_PERMISSIONS,
            roles: stored,
            permissions: ALL_PERMISSIONS,
        });
    } catch (e) {
        return handleRouteError("GET /api/admin/permissions", e);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_roles" });
        const body = await parseBody<UpdateInput>(updateSchema as never, request);

        const role = await t.db.query.roles.findFirst({
            where: and(eq(roles.id, body.roleId), eq(roles.workspaceId, t.workspaceId)),
        });
        if (!role) throw new ApiError("Role not found", 404);
        if (role.isSystem || SYSTEM_ROLE_NAMES.has(role.name)) {
            throw new ApiError("System roles cannot be edited", 400);
        }

        const updated = await t.db
            .update(roles)
            .set({ permissions: body.permissions })
            .where(eq(roles.id, role.id))
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "update_permissions",
            entityType: "role",
            entityId: role.id,
            metadata: { name: role.name, permissions: body.permissions },
            ipAddress: clientIp(request),
        });

        return ok(updated[0]);
    } catch (e) {
        return handleRouteError("PUT /api/admin/permissions", e);
    }
}
