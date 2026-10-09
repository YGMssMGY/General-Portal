import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb, listPortalSlugs, type PortalDb } from "@/db/client";
import { emailOtps } from "@/db/schema";
import { config } from "@/config";
import { clientIp, handleRouteError } from "@/lib/api";
import {
    AccessDenied,
    accessDeniedRedirect,
    readReturnTo,
    createSessionForUser,
    sessionRedirectResponse,
} from "@/lib/auth/session";
import { sha256Hex } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const token = new URL(request.url).searchParams.get("token");
        if (!token) return accessDeniedRedirect();
        const digest = sha256Hex(token);
        const hint = request.cookies.get(config.portalCookie)?.value ?? null;
        const slugs = hint
            ? [hint, ...listPortalSlugs().filter((s) => s !== hint)]
            : listPortalSlugs();
        for (const slug of slugs) {
            let db: PortalDb;
            try {
                db = getDb(slug);
            } catch {
                continue;
            }
            let row;
            try {
                const rows = await db.query.emailOtps.findMany({
                    where: and(
                        eq(emailOtps.codeHash, digest),
                        eq(emailOtps.purpose, "magic-link"),
                        isNull(emailOtps.consumedAt),
                        gt(emailOtps.expiresAt, new Date()),
                    ),
                    limit: 1,
                });
                row = rows[0];
            } catch {
                continue;
            }
            if (!row) continue;
            await db
                .update(emailOtps)
                .set({ consumedAt: new Date() })
                .where(eq(emailOtps.id, row.id));
            try {
                const login = await createSessionForUser({
                    slug: row.portal,
                    provider: "email-otp",
                    email: row.email,
                    ip: clientIp(request),
                    userAgent: request.headers.get("user-agent"),
                });
                return sessionRedirectResponse(login.token, login.portal, readReturnTo(request));
            } catch (e) {
                if (e instanceof AccessDenied) return accessDeniedRedirect();
                throw e;
            }
        }
        return accessDeniedRedirect();
    } catch (e) {
        return handleRouteError("auth/otp/consume", e);
    }
}
