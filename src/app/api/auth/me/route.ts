import { NextRequest } from "next/server";
import { fail, handleRouteError, ok } from "@/lib/api";
import { getSession, resolvePortalSlug } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const slug = resolvePortalSlug(request);
        const session = await getSession(request);
        if (!session) return fail("Unauthorized", 401);
        return ok({
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: session.roleName,
            permissions: session.permissions,
            portal: slug,
            locale: session.user.locale,
        });
    } catch (e) {
        return handleRouteError("auth/me", e);
    }
}
