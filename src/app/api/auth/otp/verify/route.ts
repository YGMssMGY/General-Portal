import { timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDb, listPortalSlugs, type PortalDb } from "@/db/client";
import { emailOtps } from "@/db/schema";
import { config } from "@/config";
import { ApiError, clientIp, handleRouteError, parseBody } from "@/lib/api";
import { error as apiError } from "@/lib/api-response";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { AccessDenied, createSessionForUser, sessionJsonResponse } from "@/lib/auth/session";
import { sha256Hex } from "@/lib/tenant";

const emailSchema = z.string().trim().min(3).max(320).toLowerCase().pipe(z.email());

const verifySchema = z.object({
    email: emailSchema,
    code: z.string().trim().min(4).max(128),
});

function hashMatches(code: string, codeHash: string): boolean {
    try {
        const a = Buffer.from(sha256Hex(code), "hex");
        const b = Buffer.from(codeHash, "hex");
        return a.length === b.length && timingSafeEqual(a, b);
    } catch {
        return false;
    }
}

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

export async function POST(request: NextRequest) {
    try {
        const body = await parseBody(verifySchema, request);
        checkRateLimit(rateKey(clientIp(request), "email-otp"));
        const hint = request.cookies.get(config.portalCookie)?.value ?? null;
        const slugs = hint
            ? [hint, ...listPortalSlugs().filter((s) => s !== hint)]
            : listPortalSlugs();
        const candidates = await mapPortals(slugs, (db, slug) =>
            db.query.emailOtps.findMany({
                where: and(
                    eq(emailOtps.email, body.email),
                    eq(emailOtps.purpose, "login"),
                    or(isNull(emailOtps.portal), eq(emailOtps.portal, slug)),
                    isNull(emailOtps.consumedAt),
                    gt(emailOtps.expiresAt, new Date()),
                ),
                orderBy: [desc(emailOtps.createdAt)],
                limit: 1,
            }),
        );
        for (const candidate of candidates) {
            const row = candidate?.value[0];
            if (!row) continue;
            const db = candidate.db;
            const claimed = await db
                .update(emailOtps)
                .set({ attempts: sql`${emailOtps.attempts} + 1` })
                .where(and(eq(emailOtps.id, row.id), lt(emailOtps.attempts, 5)))
                .returning({ id: emailOtps.id });
            if (!claimed[0]) throw new ApiError("Too many requests", 429);
            if (!hashMatches(body.code, row.codeHash))
                return apiError("Invalid or expired code", 400);
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
                return sessionJsonResponse(login.token, login.portal, { verified: true });
            } catch (e) {
                if (e instanceof AccessDenied) return apiError("AccessDenied", 403);
                throw e;
            }
        }
        return apiError("Invalid or expired code", 400);
    } catch (e) {
        return handleRouteError("auth/otp/verify", e);
    }
}
