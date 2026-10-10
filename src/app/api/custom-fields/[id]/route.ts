import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { customFieldDefs } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const updateDefSchema = z.object({
    label: z.string().trim().min(1).max(128).optional(),
    fieldType: z.enum(["text", "number", "date", "select", "boolean"]).optional(),
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1)).max(50).optional(),
    position: z.number().int().min(0).optional(),
});
type UpdateDefInput = z.infer<typeof updateDefSchema>;

const scoped = (id: string, workspaceId: string) =>
    and(eq(customFieldDefs.id, id), eq(customFieldDefs.workspaceId, workspaceId));

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_custom_fields",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.customFieldDefs.findFirst({
            where: scoped(id, t.workspaceId),
        });
        if (!existing) throw new ApiError("Custom field not found", 404);
        const body = await parseBody<UpdateDefInput>(updateDefSchema as never, request);
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);
        const updated = await t.db
            .update(customFieldDefs)
            .set(body)
            .where(scoped(id, t.workspaceId))
            .returning();
        if (!updated[0]) throw new ApiError("Custom field not found", 404);
        return ok(updated[0]);
    } catch (e) {
        return handleRouteError("PUT /api/custom-fields/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_custom_fields",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.customFieldDefs.findFirst({
            where: scoped(id, t.workspaceId),
        });
        if (!existing) throw new ApiError("Custom field not found", 404);
        await t.db.delete(customFieldDefs).where(scoped(id, t.workspaceId));
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/custom-fields/[id]", e);
    }
}
