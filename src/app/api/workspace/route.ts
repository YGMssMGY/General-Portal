import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request);
        return ok({
            id: t.workspace.id,
            name: t.workspace.name,
            description: t.workspace.description,
            logoUrl: t.workspace.logoUrl,
            slug: t.workspace.slug,
            settings: t.workspace.settings,
        });
    } catch (e) {
        return handleRouteError("GET /api/workspace", e);
    }
}
