import type { NextRequest } from "next/server";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {});
        return ok({
            id: t.user.id,
            name: t.user.name,
            email: t.user.email,
            image: t.user.image,
            role: t.roleName,
            permissions: t.permissions,
            portal: t.portal,
            locale: t.user.locale,
            timezone: t.user.timezone,
        });
    } catch (e) {
        return handleRouteError("GET /api/me", e);
    }
}
