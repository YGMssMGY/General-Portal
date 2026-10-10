import type { NextRequest } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { PortalDb } from "@/db/client";
import { eventRsvps, events } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

async function findEvent(db: PortalDb, workspaceId: string, id: string) {
    const event = await db.query.events.findFirst({
        where: and(
            eq(events.id, id),
            eq(events.workspaceId, workspaceId),
            isNull(events.deletedAt),
        ),
    });
    if (!event) throw new ApiError("Event not found", 404);
    return event;
}

function ensureOpen(event: { status: string; startDate: Date }) {
    if (event.status !== "published") {
        throw new ApiError("Event is not open for registration", 400);
    }
    if (event.startDate.getTime() <= Date.now()) {
        throw new ApiError("Event registration has closed", 400);
    }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const id = requireUuid((await params).id);
        await findEvent(t.db, t.workspaceId, id);
        const rows = await t.db.query.eventRsvps.findMany({
            where: and(eq(eventRsvps.eventId, id), eq(eventRsvps.status, "going")),
            orderBy: [asc(eventRsvps.createdAt)],
            with: { user: { columns: { id: true, name: true } } },
        });
        return ok({
            count: rows.length,
            attendees: rows.map((r) => ({
                id: r.id,
                userId: r.userId,
                name: r.user?.name ?? null,
                status: r.status,
                createdAt: r.createdAt,
            })),
            myStatus: rows.some((r) => r.userId === t.userId) ? "going" : null,
        });
    } catch (e) {
        return handleRouteError("GET /api/events/[id]/register", e);
    }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const id = requireUuid((await params).id);
        const event = await findEvent(t.db, t.workspaceId, id);
        ensureOpen(event);
        const [created] = await t.db
            .insert(eventRsvps)
            .values({ eventId: id, userId: t.userId, status: "going" })
            .onConflictDoNothing({ target: [eventRsvps.eventId, eventRsvps.userId] })
            .returning();
        if (created) {
            await emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "registered",
                entityType: "event_rsvp",
                entityId: created.id,
                metadata: { eventId: id, title: event.title },
                ipAddress: clientIp(request),
            });
            return ok(created, 201);
        }
        const existing = await t.db.query.eventRsvps.findFirst({
            where: and(eq(eventRsvps.eventId, id), eq(eventRsvps.userId, t.userId)),
        });
        if (existing && existing.status === "cancelled") {
            const [revived] = await t.db
                .update(eventRsvps)
                .set({ status: "going" })
                .where(eq(eventRsvps.id, existing.id))
                .returning();
            await emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "registered",
                entityType: "event_rsvp",
                entityId: existing.id,
                metadata: { eventId: id, title: event.title },
                ipAddress: clientIp(request),
            });
            return ok(revived);
        }
        throw new ApiError("Already registered for this event", 409);
    } catch (e) {
        return handleRouteError("POST /api/events/[id]/register", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const id = requireUuid((await params).id);
        await findEvent(t.db, t.workspaceId, id);
        const existing = await t.db.query.eventRsvps.findFirst({
            where: and(eq(eventRsvps.eventId, id), eq(eventRsvps.userId, t.userId)),
        });
        if (!existing) throw new ApiError("Registration not found", 404);
        await Promise.all([
            t.db
                .update(eventRsvps)
                .set({ status: "cancelled" })
                .where(eq(eventRsvps.id, existing.id)),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "cancelled_registration",
                entityType: "event_rsvp",
                entityId: existing.id,
                metadata: { eventId: id },
                ipAddress: clientIp(request),
            }),
        ]);
        return ok({ cancelled: true });
    } catch (e) {
        return handleRouteError("DELETE /api/events/[id]/register", e);
    }
}
