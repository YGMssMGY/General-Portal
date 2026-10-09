import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { memberships, subgroupMemberships, subgroups } from "@/db/schema";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    ok,
    parseBody,
    parsePagination,
    requireUuid,
} from "@/lib/api";
import { requireTenant, type TenantContext } from "@/lib/tenant";
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

const addSchema = z.object({
    userIds: z.array(z.uuid()).min(1).max(200),
});

async function scopedSubgroup(t: TenantContext, subgroupId: string) {
    const sg = await t.db.query.subgroups.findFirst({
        where: and(
            eq(subgroups.id, subgroupId),
            eq(subgroups.workspaceId, t.workspaceId),
            isNull(subgroups.deletedAt),
        ),
        columns: { id: true, name: true },
    });
    if (!sg) throw new ApiError("Subgroup not found", 404);
    return sg;
}

async function removeMember(t: TenantContext, subgroupId: string, targetUserId: string) {
    requireUuid(subgroupId);
    requireUuid(targetUserId, "userId");
    const sg = await scopedSubgroup(t, subgroupId);

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
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_subgroups",
            module: "members",
        });
        const { id } = await params;
        const subgroupId = requireUuid(id);
        await scopedSubgroup(t, subgroupId);

        const { limit, cursor } = parsePagination(request.nextUrl.searchParams);
        const cVals = decodeCursorValues(cursor);
        const cDate =
            cVals && typeof cVals[0] === "string" && !Number.isNaN(new Date(cVals[0]).getTime())
                ? new Date(cVals[0])
                : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cDate && cId
                ? or(
                      gt(subgroupMemberships.joinedAt, cDate),
                      and(eq(subgroupMemberships.joinedAt, cDate), gt(subgroupMemberships.id, cId)),
                  )
                : undefined;

        const rows = await t.db.query.subgroupMemberships.findMany({
            where: and(eq(subgroupMemberships.subgroupId, subgroupId), cursorCond),
            orderBy: [asc(subgroupMemberships.joinedAt), asc(subgroupMemberships.id)],
            limit: limit + 1,
            with: { user: { columns: { id: true, name: true, email: true, image: true } } },
        });

        const items = rows.slice(0, limit);
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last && last.joinedAt
                ? encodeCursorValues([last.joinedAt.toISOString(), last.id])
                : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/subgroups/[id]/members", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_subgroups",
            module: "members",
        });
        const { id } = await params;
        const subgroupId = requireUuid(id);
        const sg = await scopedSubgroup(t, subgroupId);
        const data = await parseBody(body(addSchema), request);

        const memberRows = await t.db.query.memberships.findMany({
            where: and(
                eq(memberships.workspaceId, t.workspaceId),
                inArray(memberships.userId, data.userIds),
            ),
            columns: { userId: true },
        });
        const valid = new Set(memberRows.map((m) => m.userId));
        const invalid = data.userIds.filter((uid) => !valid.has(uid));
        if (invalid.length > 0)
            throw new ApiError("One or more users are not workspace members", 400);

        await t.db
            .insert(subgroupMemberships)
            .values(data.userIds.map((userId) => ({ subgroupId, userId })))
            .onConflictDoNothing({
                target: [subgroupMemberships.subgroupId, subgroupMemberships.userId],
            });

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "add_members",
                entityType: "subgroup",
                entityId: subgroupId,
                metadata: { userIds: data.userIds, name: sg.name },
            },
            t.db,
        );

        return ok({ added: data.userIds.length });
    } catch (e) {
        return handleRouteError("POST /api/subgroups/[id]/members", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { id } = await params;
        const userId = request.nextUrl.searchParams.get("userId");
        if (!userId) throw new ApiError("Missing userId", 400);
        return await removeMember(t, id, userId);
    } catch (e) {
        return handleRouteError("DELETE /api/subgroups/[id]/members", e);
    }
}
