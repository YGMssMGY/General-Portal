import { success, error } from "@/lib/api-response";
import { getDbForPortal } from "@/lib/db";

export async function GET() {
  try {
    const portals = ["developers", "stuco"] as const;
    const allEvents: unknown[] = [];
    const allGalleries: unknown[] = [];

    for (const slug of portals) {
      try {
        const db = getDbForPortal(slug);

        const workspace = await db.workspace.findUnique({
          where: { slug },
          select: { id: true },
        });
        if (!workspace) continue;

        const [events, galleries] = await Promise.all([
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
          Promise.resolve([]),
        ]);

        allEvents.push(
          ...events.map((e) => ({
            ...e,
            portal: slug,
          })),
        );

        allGalleries.push(...galleries);
      } catch {
        // skip portal if unreachable
      }
    }

    allEvents.sort(
      (a: any, b: any) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    );

    return success({ events: allEvents, galleries: allGalleries });
  } catch (e) {
    console.error("GET /api/public/showcase", e);
    return error("Internal server error", 500);
  }
}
