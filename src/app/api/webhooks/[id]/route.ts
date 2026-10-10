import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { webhooks } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const updateWebhookSchema = z.object({
    name: z.string().trim().min(1).max(128).optional(),
    url: z
        .string()
        .trim()
        .url()
        .refine((u) => u.startsWith("https://"), "URL must use https")
        .optional(),
    secret: z.string().max(256).nullable().optional(),
    events: z.array(z.string().trim().min(1).max(64)).min(1).max(50).optional(),
    active: z.boolean().optional(),
});
type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;

const scoped = (id: string, workspaceId: string) =>
    and(eq(webhooks.id, id), eq(webhooks.workspaceId, workspaceId));

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_webhooks",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.webhooks.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Webhook not found", 404);
        const body = await parseBody<UpdateWebhookInput>(updateWebhookSchema as never, request);
        if (Object.keys(body).length === 0) throw new ApiError("No fields to update", 400);
        const updated = await t.db
            .update(webhooks)
            .set(body)
            .where(scoped(id, t.workspaceId))
            .returning();
        if (!updated[0]) throw new ApiError("Webhook not found", 404);
        return ok({ ...updated[0], secret: updated[0].secret ? "••••••" : null });
    } catch (e) {
        return handleRouteError("PUT /api/webhooks/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_webhooks",
            module: "members",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.webhooks.findFirst({ where: scoped(id, t.workspaceId) });
        if (!existing) throw new ApiError("Webhook not found", 404);
        await t.db.delete(webhooks).where(scoped(id, t.workspaceId));
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/webhooks/[id]", e);
    }
}
