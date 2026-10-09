import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { showcaseItems } from "@/db/schema";
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
    type: z.string().trim().min(1).max(50).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullish().optional(),
    imageUrl: z.string().trim().max(2000).nullish().optional(),
    linkUrl: z.string().trim().max(2000).nullish().optional(),
    sortOrder: z.number().int().min(0).max(1000000).optional(),
    isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return PUT(request, { params });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_showcase",
            module: "members",
        });
        const { id } = await params;
        const itemId = requireUuid(id);
        const data = await parseBody(body(updateSchema), request);

        const existing = await t.db.query.showcaseItems.findFirst({
            where: and(
                eq(showcaseItems.id, itemId),
                eq(showcaseItems.workspaceId, t.workspaceId),
                isNull(showcaseItems.deletedAt),
            ),
            columns: { id: true },
        });
        if (!existing) throw new ApiError("Showcase item not found", 404);

        const patch: {
            type?: string;
            title?: string;
            description?: string | null;
            imageUrl?: string | null;
            linkUrl?: string | null;
            sortOrder?: number;
            isActive?: boolean;
        } = {};
        if (data.type !== undefined) patch.type = data.type;
        if (data.title !== undefined) patch.title = data.title;
        if (data.description !== undefined) patch.description = data.description;
        if (data.imageUrl !== undefined) patch.imageUrl = data.imageUrl;
        if (data.linkUrl !== undefined) patch.linkUrl = data.linkUrl;
        if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
        if (data.isActive !== undefined) patch.isActive = data.isActive;
        if (Object.keys(patch).length === 0) throw new ApiError("No fields to update", 400);

        const [updated] = await t.db
            .update(showcaseItems)
            .set({ ...patch, updatedAt: new Date() })
            .where(eq(showcaseItems.id, itemId))
            .returning();

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "update",
                entityType: "showcase_item",
                entityId: itemId,
                metadata: { title: updated.title },
            },
            t.db,
        );

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/showcase/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_showcase",
            module: "members",
        });
        const { id } = await params;
        const itemId = requireUuid(id);

        const existing = await t.db.query.showcaseItems.findFirst({
            where: and(
                eq(showcaseItems.id, itemId),
                eq(showcaseItems.workspaceId, t.workspaceId),
                isNull(showcaseItems.deletedAt),
            ),
            columns: { id: true, title: true },
        });
        if (!existing) throw new ApiError("Showcase item not found", 404);

        const permanent = request.nextUrl.searchParams.get("permanent") === "true";
        const hard = permanent && t.roleName === "admin";
        if (hard) {
            await t.db.delete(showcaseItems).where(eq(showcaseItems.id, itemId));
        } else {
            await t.db
                .update(showcaseItems)
                .set({ deletedAt: new Date(), updatedAt: new Date() })
                .where(eq(showcaseItems.id, itemId));
        }

        await writeAuditLog(
            {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: hard ? "delete_permanent" : "delete",
                entityType: "showcase_item",
                entityId: itemId,
                metadata: { title: existing.title },
            },
            t.db,
        );

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/showcase/[id]", e);
    }
}
