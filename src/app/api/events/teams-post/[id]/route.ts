import type { NextRequest } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { events } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";
import { postEventToTeams } from "@/lib/teams";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_all_events",
            module: "events",
        });
        const id = requireUuid((await params).id);
        const event = await t.db.query.events.findFirst({
            where: and(
                eq(events.id, id),
                eq(events.workspaceId, t.workspaceId),
                isNull(events.deletedAt),
            ),
        });
        if (!event) throw new ApiError("Event not found", 404);
        if (event.teamsMessageId) throw new ApiError("Event has already been posted to Teams", 400);

        const origin = request.headers.get("origin") ?? "https://generalportal.com";
        const dateStr = event.startDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

        const posted = await postEventToTeams({
            title: event.title,
            description: event.description ?? "",
            date: dateStr,
            location: event.location ?? undefined,
            url: `${origin}/events/${id}`,
        });
        if (!posted) throw new ApiError("Failed to post event to Teams", 500);

        await Promise.all([
            t.db
                .update(events)
                .set({ teamsMessageId: "sent", updatedAt: new Date() })
                .where(
                    and(
                        eq(events.id, id),
                        eq(events.workspaceId, t.workspaceId),
                        isNull(events.deletedAt),
                    ),
                ),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "post_to_teams",
                entityType: "event",
                entityId: id,
                metadata: { title: event.title },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok({ id, title: event.title, teamsMessageId: "sent" });
    } catch (e) {
        return handleRouteError("POST /api/events/teams-post/[id]", e);
    }
}
