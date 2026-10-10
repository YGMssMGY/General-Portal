import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb, isKnownPortal, normalizeSlug } from "@/db/client";
import { emailOtps, memberships, users, workspaces } from "@/db/schema";
import { config } from "@/config";
import { clientIp, handleRouteError, ok, parseBody } from "@/lib/api";
import { sendAuthMail } from "@/lib/auth/email";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { sha256Hex, resolvePortalSlug } from "@/lib/tenant";
import { logger } from "@/lib/logger";

const emailSchema = z.string().trim().min(3).max(320).toLowerCase().pipe(z.email());

const requestSchema = z.object({
    email: emailSchema,
    portal: z.string().trim().min(1).max(64).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await parseBody(requestSchema, request);
        checkRateLimit(rateKey(clientIp(request), "password-reset"));
        const hint = body.portal ? (normalizeSlug(body.portal) ?? "") : "";
        const slug = hint && isKnownPortal(hint) ? hint : resolvePortalSlug(request);
        try {
            const db = getDb(slug);
            const workspace = await db.query.workspaces.findFirst({
                where: eq(workspaces.slug, slug),
            });
            if (workspace) {
                const user = await db.query.users.findFirst({
                    where: eq(users.email, body.email),
                });
                const member = user
                    ? await db.query.memberships.findFirst({
                          where: and(
                              eq(memberships.workspaceId, workspace.id),
                              eq(memberships.userId, user.id),
                          ),
                      })
                    : null;
                if (user && !user.disabled && member) {
                    await db
                        .update(emailOtps)
                        .set({ consumedAt: new Date() })
                        .where(
                            and(
                                eq(emailOtps.email, body.email),
                                eq(emailOtps.purpose, "password-reset"),
                                isNull(emailOtps.consumedAt),
                            ),
                        );
                    const code = String(randomInt(100000, 1000000));
                    await db.insert(emailOtps).values({
                        email: body.email,
                        codeHash: sha256Hex(code),
                        purpose: "password-reset",
                        portal: slug,
                        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                    });
                    if (config.nodeEnv !== "production") {
                        logger.info({ portal: slug, code }, "password reset issued");
                    }
                    try {
                        await sendAuthMail(
                            body.email,
                            "Reset your password",
                            `Your password reset code is:\n\n${code}\n\nIt expires in 15 minutes.`,
                        );
                    } catch {
                        logger.info({ portal: slug }, "password reset code generated without SMTP");
                    }
                }
            }
        } catch {
            void 0;
        }
        return ok({ sent: true });
    } catch (e) {
        return handleRouteError("auth/password/reset-request", e);
    }
}
