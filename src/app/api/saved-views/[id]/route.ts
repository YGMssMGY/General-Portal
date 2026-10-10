import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { savedViews } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const updateViewSchema = z.object({
    name: z.string().trim().min(1).max(128).optional(),
    filters: z.record(z.string(), z.unknown()).optional(),
    isShared: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
});
type UpdateViewInput = z.infer<typeof updateViewSchema>;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.savedViews.findFirst({
            where: and(eq(savedViews.id, id), eq(savedViews.workspaceId, t.workspaceId)),
        });
        if (!existing) throw new ApiError("Saved view not found", 404);
        if (existing.userId !== t.userId && !t.permissions.includes("manage_all_tasks")) {
            throw new ApiError("Forbidden", 403);
        }
        const body = await parseBody<UpdateViewInput>(updateViewSchema as never, request);
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);
        const set: Partial<typeof savedViews.$inferInsert> = {};
        if (body.name !== undefined) set.name = body.name;
        if (body.filters !== undefined) set.filters = body.filters as Record<string, unknown>;
        if (body.position !== undefined) set.position = body.position;
        if (body.isShared !== undefined) {
            set.isShared =
                body.isShared === true && t.roleName === "member" ? false : body.isShared;
        }
        const updated = await t.db
            .update(savedViews)
            .set(set)
            .where(and(eq(savedViews.id, id), eq(savedViews.workspaceId, t.workspaceId)))
            .returning();
        if (!updated[0]) throw new ApiError("Saved view not found", 404);
        return ok(updated[0]);
    } catch (e) {
        return handleRouteError("PUT /api/saved-views/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.savedViews.findFirst({
            where: and(eq(savedViews.id, id), eq(savedViews.workspaceId, t.workspaceId)),
        });
        if (!existing) throw new ApiError("Saved view not found", 404);
        if (existing.userId !== t.userId && !t.permissions.includes("manage_all_tasks")) {
            throw new ApiError("Forbidden", 403);
        }
        await t.db
            .delete(savedViews)
            .where(and(eq(savedViews.id, id), eq(savedViews.workspaceId, t.workspaceId)));
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/saved-views/[id]", e);
    }
}
