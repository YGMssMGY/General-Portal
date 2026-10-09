import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { messageThreads, subgroupMemberships, subgroups, tasks } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";

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

const updateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2000).nullish().optional(),
    color: z.string().trim().max(32).nullish().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { id } = await params;
        const subgroupId = requireUuid(id);

        const subgroup = await t.db.query.subgroups.findFirst({
            where: and(
                eq(subgroups.id, subgroupId),
                eq(subgroups.workspaceId, t.workspaceId),
                isNull(subgroups.deletedAt),
            ),
            with: {
                members: {
                    orderBy: [asc(subgroupMemberships.joinedAt)],
                    with: { user: { columns: { id: true, name: true, email: true, image: true } } },
                },
            },
        });
        if (!subgroup) throw new ApiError("Subgroup not found", 404);

        const [{ n }] = await t.db
            .select({ n: count() })
            .from(subgroupMemberships)
            .where(eq(subgroupMemberships.subgroupId, subgroupId));

        return ok({ ...subgroup, _count: { members: n } });
    } catch (e) {
        return handleRouteError("GET /api/subgroups/[id]", e);
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_subgroups",
            module: "members",
        });
        const { id } = await params;
        const subgroupId = requireUuid(id);
        const data = await parseBody(body(updateSchema), request);

        const existing = await t.db.query.subgroups.findFirst({
            where: and(
                eq(subgroups.id, subgroupId),
                eq(subgroups.workspaceId, t.workspaceId),
                isNull(subgroups.deletedAt),
            ),
            columns: { id: true },
        });
        if (!existing) throw new ApiError("Subgroup not found", 404);

        const patch: { name?: string; description?: string | null; color?: string | null } = {};
        if (data.name !== undefined) patch.name = data.name;
        if (data.description !== undefined) patch.description = data.description;
        if (data.color !== undefined) patch.color = data.color;
        if (Object.keys(patch).length === 0) throw new ApiError("No fields to update", 400);

        const [updated] = await t.db
            .update(subgroups)
            .set({ ...patch, updatedAt: new Date() })
            .where(eq(subgroups.id, subgroupId))
            .returning();

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "subgroup",
                entityId: subgroupId,
                metadata: { name: updated.name },
            },
            t.db,
        );

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/subgroups/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_subgroups",
            module: "members",
        });
        const { id } = await params;
        const subgroupId = requireUuid(id);

        const existing = await t.db.query.subgroups.findFirst({
            where: and(
                eq(subgroups.id, subgroupId),
                eq(subgroups.workspaceId, t.workspaceId),
                isNull(subgroups.deletedAt),
            ),
            columns: { id: true, name: true },
        });
        if (!existing) throw new ApiError("Subgroup not found", 404);

        const permanent = request.nextUrl.searchParams.get("permanent") === "true";
        const hard = permanent && t.roleName === "admin";
        if (hard) {
            const [taskRef] = await t.db
                .select({ n: count() })
                .from(tasks)
                .where(and(eq(tasks.subgroupId, subgroupId), isNull(tasks.deletedAt)));
            const [threadRef] = await t.db
                .select({ n: count() })
                .from(messageThreads)
                .where(
                    and(
                        eq(messageThreads.subgroupId, subgroupId),
                        isNull(messageThreads.deletedAt),
                    ),
                );
            if ((taskRef?.n ?? 0) > 0 || (threadRef?.n ?? 0) > 0) {
                throw new ApiError("Cannot permanently delete: subgroup is still in use", 409);
            }
            await t.db.delete(subgroups).where(eq(subgroups.id, subgroupId));
        } else {
            await t.db
                .update(subgroups)
                .set({ deletedAt: new Date(), updatedAt: new Date() })
                .where(eq(subgroups.id, subgroupId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: hard ? "delete_permanent" : "delete",
                entityType: "subgroup",
                entityId: subgroupId,
                metadata: { name: existing.name },
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/subgroups/[id]", e);
    }
}
