import { eq } from "drizzle-orm";
import { listPortals } from "@/lib/deployment";
import { getDb } from "@/db/client";
import { workspaces } from "@/db/schema";
import { ok } from "@/lib/api";

type PortalRow = {
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
};

export async function GET() {
    const slugs = listPortals().map(({ slug }) => slug);
    const portals: PortalRow[] = [];
    for (let i = 0; i < slugs.length; i += 8) {
        const chunk = slugs.slice(i, i + 8);
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
    return ok(portals);
}
