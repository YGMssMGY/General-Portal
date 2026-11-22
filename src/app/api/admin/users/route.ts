import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { memberships, roles, users } from "@/db/schema";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
    requireUuid,
} from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/passwords";
import { logger } from "@/lib/logger";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_users", module: "members" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const conds = [eq(memberships.workspaceId, t.workspaceId)];
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: memberships.createdAt, value: at }],
                        memberships.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.memberships.findMany({
            where: and(...conds),
            orderBy: [desc(memberships.createdAt), desc(memberships.id)],
            limit: limit + 1,
            with: {
                role: true,
                user: { columns: { id: true, name: true, email: true, image: true } },
            },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const items = rows.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            role: m.role?.name ?? "member",
            membershipId: m.id,
            joinedAt: m.createdAt,
        }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/admin/users", e);
    }
}

const upsertUserSchema = z.object({
    email: z.email(),
    name: z.string().trim().max(200).nullish(),
    role: z.string().trim().max(100).nullish(),
    roleId: z.string().nullish(),
    password: z.string().min(12).max(256).optional(),
});
type UpsertUserInput = z.infer<typeof upsertUserSchema>;

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_users", module: "members" });
        const body = await parseBody<UpsertUserInput>(upsertUserSchema as never, request);

        const email = body.email.trim().toLowerCase();
        if (!email) throw new ApiError("Email is required", 400);

        let roleRow;
        const roleId = body.roleId?.trim() || null;
        if (roleId) {
            requireUuid(roleId, "roleId");
            roleRow = await t.db.query.roles.findFirst({
                where: and(eq(roles.id, roleId), eq(roles.workspaceId, t.workspaceId)),
            });
            if (!roleRow) throw new ApiError("Role not found in this workspace", 400);
        } else {
            const roleName = body.role?.trim() || "member";
            roleRow = await t.db.query.roles.findFirst({
                where: and(eq(roles.workspaceId, t.workspaceId), eq(roles.name, roleName)),
            });
            if (!roleRow) throw new ApiError(`Role "${roleName}" not found in this workspace`, 400);
        }

        let userRow = await t.db.query.users.findFirst({ where: eq(users.email, email) });
        if (!userRow) {
            const inserted = await t.db
                .insert(users)
                .values({
                    email,
                    name: body.name?.trim() || null,
                    passwordHash: body.password ? await hashPassword(body.password) : null,
                })
                .returning();
            userRow = inserted[0];
            if (!userRow) throw new ApiError("Failed to create user", 500);
        } else if (body.name?.trim()) {
            await t.db
                .update(users)
                .set({ name: body.name.trim(), updatedAt: new Date() })
                .where(eq(users.id, userRow.id));
        }

        const existing = await t.db.query.memberships.findFirst({
            where: and(
                eq(memberships.workspaceId, t.workspaceId),
                eq(memberships.userId, userRow.id),
            ),
        });
        if (existing) {
            await t.db
                .update(memberships)
                .set({ roleId: roleRow.id })
                .where(eq(memberships.id, existing.id));
        } else {
            await t.db
                .insert(memberships)
                .values({ workspaceId: t.workspaceId, userId: userRow.id, roleId: roleRow.id });
        }

        try {
            await writeAuditLog(
                {
                    workspaceId: t.workspaceId,
                    userId: t.userId,
                    action: "create_user",
                    entityType: "user",
                    entityId: userRow.id,
                    metadata: { email, role: roleRow.name },
                },
                t.db,
                true,
            );
        } catch (err) {
            logger.error({ err }, "audit write failed after user creation");
        }

        return ok(
            {
                user: {
                    id: userRow.id,
                    name: body.name?.trim() || userRow.name,
                    email: userRow.email,
                    image: userRow.image,
                },
                role: roleRow.name,
            },
            201,
        );
    } catch (e) {
        return handleRouteError("POST /api/admin/users", e);
    }
}
