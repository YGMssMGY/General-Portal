import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { listPortals } from "@/lib/deployment";
import { getDb } from "@/db/client";
import { events, showcaseItems, workspaces } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";

export async function GET() {
    try {
        const allEvents: Array<Record<string, unknown>> = [];
        const galleries: unknown[] = [];
        const announcements: unknown[] = [];

        for (const { slug } of listPortals()) {
            try {
                const db = getDb(slug);
                const ws = await db.query.workspaces.findFirst({
                    where: eq(workspaces.slug, slug),
                    columns: { id: true },
                });
                if (!ws) continue;

                const [rows, items] = await Promise.all([
                    db.query.events.findMany({
                        where: and(
                            eq(events.workspaceId, ws.id),
                            eq(events.isPublic, true),
                            eq(events.status, "published"),
                            isNull(events.deletedAt),
                        ),
                        orderBy: [desc(events.startDate)],
                        limit: 10,
                    }),
                    db.query.showcaseItems.findMany({
                        where: and(
                            eq(showcaseItems.workspaceId, ws.id),
                            eq(showcaseItems.isActive, true),
                            isNull(showcaseItems.deletedAt),
                        ),
                        orderBy: [asc(showcaseItems.sortOrder)],
                    }),
                ]);

                for (const e of rows) {
                    allEvents.push({
                        id: e.id,
                        title: e.title,
                        description: e.description,
                        startDate: e.startDate,
                        endDate: e.endDate,
                        location: e.location,
                        createdAt: e.createdAt,
                        portal: slug,
                    });
                }

                for (const item of items) {
                    if (item.type === "announcement") {
                        announcements.push({
                            id: item.id,
                            type: item.type,
                            title: item.title,
                            description: item.description,
                            imageUrl: item.imageUrl,
                            linkUrl: item.linkUrl,
                            createdAt: item.createdAt,
                            portal: slug,
                        });
                    } else if (item.type === "gallery_image") {
                        galleries.push({
                            id: item.id,
                            type: item.type,
                            title: item.title,
                            description: item.description,
                            imageUrl: item.imageUrl,
                            linkUrl: item.linkUrl,
                            createdAt: item.createdAt,
                            portal: slug,
                        });
                    } else {
                        allEvents.push({
                            id: item.id,
                            title: item.title,
                            description: item.description,
                            startDate: item.createdAt,
                            endDate: null,
                            location: null,
                            createdAt: item.createdAt,
                            portal: slug,
                        });
                    }
                }
            } catch {
                continue;
            }
        }

        allEvents.sort(
            (a, b) =>
                new Date(String(b.startDate)).getTime() - new Date(String(a.startDate)).getTime(),
        );

        return ok({ events: allEvents, galleries, announcements });
    } catch (e) {
        return handleRouteError("GET /api/public/showcase", e);
    }
}
