import { timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb, listPortalSlugs, type PortalDb } from "@/db/client";
import { emailOtps, sessions, users } from "@/db/schema";
import { config } from "@/config";
import { ApiError, clientIp, handleRouteError, ok, parseBody } from "@/lib/api";
import { error as apiError } from "@/lib/api-response";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { hashPassword } from "@/lib/auth/passwords";
import { sha256Hex } from "@/lib/tenant";

const emailSchema = z.string().trim().min(3).max(320).toLowerCase().pipe(z.email());

const confirmSchema = z.object({
    email: emailSchema,
    code: z.string().trim().min(4).max(128),
    newPassword: z.string().min(12).max(256),
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

export async function POST(request: NextRequest) {
    try {
        const body = await parseBody(confirmSchema, request);
        checkRateLimit(rateKey(clientIp(request), "password-reset"));
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
                        eq(emailOtps.email, body.email),
                        eq(emailOtps.purpose, "password-reset"),
                        isNull(emailOtps.consumedAt),
                        gt(emailOtps.expiresAt, new Date()),
                    ),
                    orderBy: [desc(emailOtps.createdAt)],
                    limit: 1,
                });
                row = rows[0];
            } catch {
                continue;
            }
            if (!row) continue;
            if (row.attempts >= 5) throw new ApiError("Too many requests", 429);
            await db
                .update(emailOtps)
                .set({ attempts: row.attempts + 1 })
                .where(eq(emailOtps.id, row.id));
            if (!hashMatches(body.code, row.codeHash)) {
                return apiError("Invalid or expired code", 400);
            }
            const user = await db.query.users.findFirst({
                where: eq(users.email, body.email),
                columns: { id: true },
            });
            if (user) {
                await db
                    .update(users)
                    .set({ passwordHash: await hashPassword(body.newPassword) })
                    .where(eq(users.id, user.id));
                await db
                    .update(sessions)
                    .set({ revokedAt: new Date() })
                    .where(eq(sessions.userId, user.id));
            }
            await db
                .update(emailOtps)
                .set({ consumedAt: new Date() })
                .where(eq(emailOtps.id, row.id));
            return ok({ reset: true });
        }
        return apiError("Invalid or expired code", 400);
    } catch (e) {
        return handleRouteError("auth/password/reset-confirm", e);
    }
}
