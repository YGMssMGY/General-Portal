import type { NextRequest } from "next/server";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { agendaItems, meetings } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const createItemSchema = z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullish(),
    position: z.number().int().min(0).max(100000).optional(),
});
type CreateItemInput = z.infer<typeof createItemSchema>;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "meetings" });
        const id = requireUuid((await params).id);
        const meeting = await t.db.query.meetings.findFirst({
            where: and(
                eq(meetings.id, id),
                eq(meetings.workspaceId, t.workspaceId),
                isNull(meetings.deletedAt),
            ),
            columns: { id: true },
        });
        if (!meeting) throw new ApiError("Meeting not found", 404);
        const rows = await t.db.query.agendaItems.findMany({
            where: eq(agendaItems.meetingId, id),
            orderBy: [asc(agendaItems.position), asc(agendaItems.id)],
        });
        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/meetings/[id]/agenda", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_meetings",
            module: "meetings",
        });
        const id = requireUuid((await params).id);
        const meeting = await t.db.query.meetings.findFirst({
            where: and(
                eq(meetings.id, id),
                eq(meetings.workspaceId, t.workspaceId),
                isNull(meetings.deletedAt),
            ),
            columns: { id: true, title: true },
        });
        if (!meeting) throw new ApiError("Meeting not found", 404);
        const body = await parseBody<CreateItemInput>(createItemSchema as never, request);
        let position = body.position;
        if (position === undefined) {
            const top = await t.db.query.agendaItems.findMany({
                where: eq(agendaItems.meetingId, id),
                orderBy: [desc(agendaItems.position)],
                limit: 1,
                columns: { position: true },
            });
            position = (top[0]?.position ?? -1) + 1;
        }
        const [item] = await t.db
            .insert(agendaItems)
            .values({
                meetingId: id,
                title: body.title,
                description: body.description ?? null,
                position,
                status: "open",
            })
            .returning();
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "agenda_item",
            entityId: item.id,
            metadata: { meetingId: id, title: item.title },
            ipAddress: clientIp(request),
        });
        return ok(item, 201);
    } catch (e) {
        return handleRouteError("POST /api/meetings/[id]/agenda", e);
    }
}
