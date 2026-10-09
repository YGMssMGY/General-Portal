import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db/client";
import { sessions } from "@/db/schema";
import { config } from "@/config";
import { handleRouteError, ok } from "@/lib/api";
import { clearSessionCookieHeader, resolvePortalSlug, sha256Hex } from "@/lib/tenant";

export async function POST(request: NextRequest) {
    try {
        const portal = resolvePortalSlug(request);
        const token = request.cookies.get(config.sessionCookie)?.value;
        if (token) {
            try {
                const db = getDb(portal);
                await db
                    .update(sessions)
                    .set({ revokedAt: new Date() })
                    .where(eq(sessions.tokenHash, sha256Hex(token)));
            } catch {
                void 0;
            }
        }
        const res = ok({ signedOut: true });
        res.headers.append("Set-Cookie", clearSessionCookieHeader());
        return res;
    } catch (e) {
        return handleRouteError("auth/logout", e);
    }
}
