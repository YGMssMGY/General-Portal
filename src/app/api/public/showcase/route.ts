import { success, error } from "@/lib/api-response";
import { getDbForPortal } from "@/lib/db";

export async function GET() {
  try {
    const portals = ["developers", "stuco"] as const;
    const allEvents: Record<string, unknown>[] = [];
    const allGalleries: unknown[] = [];
    const allAnnouncements: unknown[] = [];

    for (const slug of portals) {
      try {
        const db = getDbForPortal(slug);
        const workspace = await db.workspace.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (!workspace) continue;

        const [events, showcaseItems] = await Promise.all([
          db.eventItem.findMany({
            where: {
              workspaceId: workspace.id,
              isPublic: true,
              status: "published",
            },
            orderBy: { startDate: "desc" },
            take: 10,
            select: {
              id: true,
              title: true,
              description: true,
              startDate: true,
              endDate: true,
              location: true,
              createdAt: true,
            },
          }),
          db.showcaseItem.findMany({
            where: {
              workspaceId: workspace.id,
              isActive: true,
            },
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              type: true,
              title: true,
              description: true,
              imageUrl: true,
              linkUrl: true,
              createdAt: true,
            },
          }),
        ]);

        allEvents.push(
          ...events.map((e) => ({
            ...e,
            portal: slug,
          })),
        );

        for (const item of showcaseItems) {
          const base = {
            ...item,
            portal: slug,
          };
          if (item.type === "announcement") {
            allAnnouncements.push(base);
          } else if (item.type === "gallery_image") {
            allGalleries.push(base);
          } else {
            // event_feature and others supplement events view
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
        // skip portal if unreachable
      }
    }

    allEvents.sort(
      (a: Record<string, unknown>, b: Record<string, unknown>) =>
        new Date(String(b.startDate)).getTime() - new Date(String(a.startDate)).getTime(),
    );

    return success({
      events: allEvents,
      galleries: allGalleries,
      announcements: allAnnouncements,
    });
  } catch (e) {
    console.error("GET /api/public/showcase", e);
    return error("Internal server error", 500);
  }
}
