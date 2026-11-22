import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { portalProviders } from "@/lib/auth/providers";
import { getDb, isKnownPortal, listPortalSlugs, normalizeSlug } from "@/db/client";
import { workspaces } from "@/db/schema";
import { ApiError, handleRouteError, ok } from "@/lib/api";

const FLOW_PROVIDERS = new Set([
    "microsoft-entra-id",
    "basis-auth",
    "google",
    "github",
    "oidc",
    "saml",
]);

export async function GET(request: NextRequest) {
    try {
        const slug = normalizeSlug(
            request.nextUrl.searchParams.get("portal") ?? listPortalSlugs()[0] ?? "",
        );
        if (!slug) throw new ApiError("Invalid portal", 400);

        const providers = portalProviders(slug)
            .filter((id) => FLOW_PROVIDERS.has(id))
            .map((id) => ({ id }));

        let name = slug;
        if (isKnownPortal(slug)) {
            try {
                const ws = await getDb(slug).query.workspaces.findFirst({
                    where: eq(workspaces.slug, slug),
                    columns: { name: true },
                });
                if (ws) name = ws.name;
            } catch {
                name = slug;
            }
        }

        return ok({ providers, workspace: { slug, name } });
    } catch (e) {
        return handleRouteError("GET /api/auth/providers", e);
    }
}
