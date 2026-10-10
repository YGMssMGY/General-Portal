import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { agendaItems } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const updateItemSchema = z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    position: z.number().int().min(0).max(100000).optional(),
    status: z.enum(["open", "discussed", "skipped"]).optional(),
});
type UpdateItemInput = z.infer<typeof updateItemSchema>;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_meetings",
            module: "meetings",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.agendaItems.findFirst({
            where: eq(agendaItems.id, id),
            with: { meeting: true },
        });
        if (!existing || !existing.meeting || existing.meeting.workspaceId !== t.workspaceId) {
            throw new ApiError("Agenda item not found", 404);
        }
        const body = await parseBody<UpdateItemInput>(updateItemSchema as never, request);
        const set: Partial<typeof agendaItems.$inferInsert> = {};
        if (body.title !== undefined) set.title = body.title;
        if (body.description !== undefined) set.description = body.description;
        if (body.position !== undefined) set.position = body.position;
        if (body.status !== undefined) set.status = body.status;
        if (Object.keys(set).length === 0) throw new ApiError("No fields to update", 400);
        const [updated] = await t.db
            .update(agendaItems)
            .set(set)
            .where(eq(agendaItems.id, id))
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "updated",
            entityType: "agenda_item",
            entityId: id,
            metadata: { changes: Object.keys(set) },
            ipAddress: clientIp(request),
        });
        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/agenda/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_meetings",
            module: "meetings",
        });
        const id = requireUuid((await params).id);
        const existing = await t.db.query.agendaItems.findFirst({
            where: eq(agendaItems.id, id),
            columns: { id: true, title: true },
            with: { meeting: { columns: { id: true, workspaceId: true, title: true } } },
        });
        if (!existing || !existing.meeting || existing.meeting.workspaceId !== t.workspaceId) {
            throw new ApiError("Agenda item not found", 404);
        }
        await Promise.all([
            t.db.delete(agendaItems).where(eq(agendaItems.id, id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "deleted",
                entityType: "agenda_item",
                entityId: id,
                metadata: { title: existing.title },
                ipAddress: clientIp(request),
            }),
        ]);
        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/agenda/[id]", e);
    }
}
