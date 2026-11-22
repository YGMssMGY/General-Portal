import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "@/lib/api";
import { getDeployment, getPortal } from "@/lib/deployment";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request);
        const portal = getPortal(t.portal);
        return ok({
            id: t.workspace.id,
            name: t.workspace.name,
            description: t.workspace.description,
            logoUrl: t.workspace.logoUrl,
            slug: t.workspace.slug,
            settings: t.workspace.settings,
            terminology: portal.terminology,
            features: portal.features,
            modules: portal.modules,
            nav: portal.nav,
            branding: portal.branding,
            radius: getDeployment().defaults.theme.radius,
            category: portal.category,
            limits: portal.limits,
        });
    } catch (e) {
        return handleRouteError("GET /api/workspace", e);
    }
}
