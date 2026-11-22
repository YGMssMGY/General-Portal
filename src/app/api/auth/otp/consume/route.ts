import { and, eq, gt, isNull, or } from "drizzle-orm";
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

async function mapPortals<T>(
    slugs: string[],
    fn: (db: PortalDb, slug: string) => Promise<T>,
): Promise<Array<{ db: PortalDb; slug: string; value: T } | null>> {
    const out: Array<{ db: PortalDb; slug: string; value: T } | null> = [];
    for (let i = 0; i < slugs.length; i += 8) {
        const chunk = slugs.slice(i, i + 8);
        out.push(
            ...(await Promise.all(
                chunk.map(async (slug) => {
                    try {
                        const db = getDb(slug);
                        return { db, slug, value: await fn(db, slug) };
                    } catch {
                        return null;
                    }
                }),
            )),
        );
    }
    return out;
}

export async function GET(request: NextRequest) {
    try {
        const token = new URL(request.url).searchParams.get("token");
        if (!token) return accessDeniedRedirect();
        const digest = sha256Hex(token);
        const hint = request.cookies.get(config.portalCookie)?.value ?? null;
        const slugs = hint
            ? [hint, ...listPortalSlugs().filter((s) => s !== hint)]
            : listPortalSlugs();
        const candidates = await mapPortals(slugs, (db, slug) =>
            db.query.emailOtps.findMany({
                where: and(
                    eq(emailOtps.codeHash, digest),
                    eq(emailOtps.purpose, "magic-link"),
                    or(isNull(emailOtps.portal), eq(emailOtps.portal, slug)),
                    isNull(emailOtps.consumedAt),
                    gt(emailOtps.expiresAt, new Date()),
                ),
                limit: 1,
            }),
        );
        for (const candidate of candidates) {
            const row = candidate?.value[0];
            if (!row) continue;
            const db = candidate.db;
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
