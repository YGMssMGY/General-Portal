import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { events, showcaseItems, workspaces } from "@/db/schema";
import { listPortals } from "@/lib/deployment";
import { ShowcaseView, type PublicPortal, type ShowcaseData } from "./ShowcaseView";

export const revalidate = 300;

export const metadata = { title: "Showcase | General Portal" };

const CHUNK_SIZE = 8;

const emptyData = (): ShowcaseData => ({ events: [], galleries: [], announcements: [] });

async function collectPortals(): Promise<PublicPortal[]> {
    const slugs = listPortals().map(({ slug }) => slug);
    const portals: PublicPortal[] = [];
    for (let i = 0; i < slugs.length; i += CHUNK_SIZE) {
        const chunk = slugs.slice(i, i + CHUNK_SIZE);
        const rows = await Promise.all(
            chunk.map(async (slug) => {
                try {
                    return await getDb(slug).query.workspaces.findFirst({
                        where: eq(workspaces.slug, slug),
                        columns: { slug: true, name: true, description: true, logoUrl: true },
                    });
                } catch {
                    return null;
                }
            }),
        );
        for (const row of rows) if (row) portals.push(row);
    }
    return portals;
}

async function collectPortalData(slug: string): Promise<ShowcaseData> {
    const db = getDb(slug);
    const ws = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
        columns: { id: true },
    });
    if (!ws) return emptyData();

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
            limit: 100,
        }),
    ]);

    const data = emptyData();
    for (const e of rows) {
        data.events.push({
            id: e.id,
            title: e.title,
            description: e.description,
            startDate: e.startDate.toISOString(),
            endDate: e.endDate?.toISOString() ?? null,
            location: e.location,
            portal: slug,
        });
    }
    for (const item of items) {
        const common = {
            id: item.id,
            type: item.type,
            title: item.title,
            description: item.description,
            imageUrl: item.imageUrl,
            linkUrl: item.linkUrl,
            createdAt: item.createdAt.toISOString(),
            portal: slug,
        };
        if (item.type === "announcement") {
            data.announcements.push(common);
        } else if (item.type === "gallery_image") {
            data.galleries.push(common);
        } else {
            data.events.push({
                id: item.id,
                title: item.title,
                description: item.description,
                startDate: item.createdAt.toISOString(),
                endDate: null,
                location: null,
                portal: slug,
            });
        }
    }
    return data;
}

async function collectShowcase(): Promise<ShowcaseData> {
    const slugs = listPortals().map((p) => p.slug);
    const results: ShowcaseData[] = [];
    for (let i = 0; i < slugs.length; i += CHUNK_SIZE) {
        const chunk = slugs.slice(i, i + CHUNK_SIZE);
        const collected = await Promise.all(
            chunk.map(async (slug) => {
                try {
                    return await collectPortalData(slug);
                } catch {
                    return emptyData();
                }
            }),
        );
        results.push(...collected);
    }

    const allEvents = results.flatMap((r) => r.events);
    const galleries = results.flatMap((r) => r.galleries);
    const announcements = results.flatMap((r) => r.announcements);
    allEvents.sort(
        (a, b) => new Date(String(b.startDate)).getTime() - new Date(String(a.startDate)).getTime(),
    );

    return { events: allEvents, galleries, announcements };
}

export default async function ShowcasePage() {
    let portals: PublicPortal[] = [];
    let data = emptyData();
    let failed = false;
    try {
        [portals, data] = await Promise.all([collectPortals(), collectShowcase()]);
    } catch {
        failed = true;
    }
    return <ShowcaseView portals={portals} data={data} failed={failed} />;
}
