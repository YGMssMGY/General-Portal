import { eq } from "drizzle-orm";
import { listPortals } from "@/lib/deployment";
import { getDb } from "@/db/client";
import { workspaces } from "@/db/schema";
import { ok } from "@/lib/api";

export async function GET() {
    const portals: Array<{
        slug: string;
        name: string;
        description: string | null;
        logoUrl: string | null;
    }> = [];
    for (const { slug } of listPortals()) {
        try {
            const row = await getDb(slug).query.workspaces.findFirst({
                where: eq(workspaces.slug, slug),
                columns: { slug: true, name: true, description: true, logoUrl: true },
            });
            if (row) portals.push(row);
        } catch {
            continue;
        }
    }
    return ok(portals);
}
