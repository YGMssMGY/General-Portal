import { randomBytes, randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { emailOtps, memberships, users, workspaces } from "@/db/schema";
import { config } from "@/config";
import { ApiError, clientIp, handleRouteError, ok, parseBody } from "@/lib/api";
import { sendAuthMail } from "@/lib/auth/email";
import { isProviderAllowed, unavailable } from "@/lib/auth/providers";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { sha256Hex, resolvePortalSlug } from "@/lib/tenant";
import { logger } from "@/lib/logger";

const emailSchema = z.string().trim().min(3).max(320).toLowerCase().pipe(z.email());

const requestSchema = z.object({
    email: emailSchema,
    purpose: z.enum(["login", "magic-link"]).default("login"),
});

export async function POST(request: NextRequest) {
    try {
        const body = await parseBody(requestSchema, request);
        const portal = resolvePortalSlug(request);
        checkRateLimit(rateKey(clientIp(request), "email-otp"));
        if (!isProviderAllowed(portal, "email-otp")) throw new ApiError(unavailable, 503);
        const db = getDb(portal);
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.slug, portal),
        });
        let eligible = false;
        if (workspace) {
            const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
            if (user && !user.disabled) {
                const member = await db.query.memberships.findFirst({
                    where: and(
                        eq(memberships.workspaceId, workspace.id),
                        eq(memberships.userId, user.id),
                    ),
                });
                eligible = !!member;
            }
        }
        if (eligible) {
            await db
                .update(emailOtps)
                .set({ consumedAt: new Date() })
                .where(
                    and(
                        eq(emailOtps.email, body.email),
                        eq(emailOtps.purpose, body.purpose),
                        isNull(emailOtps.consumedAt),
                    ),
                );
            if (body.purpose === "magic-link") {
                const token = randomBytes(32).toString("base64url");
                await db.insert(emailOtps).values({
                    email: body.email,
                    codeHash: sha256Hex(token),
                    purpose: "magic-link",
                    portal,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                });
                if (config.nodeEnv !== "production") logger.info({ portal }, "magic link issued");
                await sendAuthMail(
                    body.email,
                    "Sign in to General Portal",
                    `Open this link to sign in:\n\n${config.baseUrl}/api/auth/otp/consume?token=${token}\n\nIt expires in 10 minutes.`,
                );
            } else {
                const code = String(randomInt(100000, 1000000));
                await db.insert(emailOtps).values({
                    email: body.email,
                    codeHash: sha256Hex(code),
                    purpose: "login",
                    portal,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                });
                if (config.nodeEnv !== "production") logger.info({ portal, code }, "otp issued");
                await sendAuthMail(
                    body.email,
                    "Your sign-in code",
                    `Your sign-in code is:\n\n${code}\n\nIt expires in 10 minutes.`,
                );
            }
        }
        return ok({ sent: true });
    } catch (e) {
        return handleRouteError("auth/otp/request", e);
    }
}
