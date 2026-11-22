import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { NextRequest } from "next/server";
import {
    verifyAuthenticationResponse,
    type AuthenticationResponseJSON,
    type AuthenticatorTransport,
} from "@simplewebauthn/server";
import { z } from "zod";
import { getDb, listPortalSlugs, type PortalDb } from "@/db/client";
import { authPending, passkeys } from "@/db/schema";
import { config } from "@/config";
import { clientIp, fail, handleRouteError, parseBody } from "@/lib/api";
import { error as apiError } from "@/lib/api-response";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { AccessDenied, createSessionForUser, sessionJsonResponse } from "@/lib/auth/session";
import { expectedOrigin, rpId } from "@/lib/auth/providers";

const verifySchema = z.object({
    email: z.string().trim().min(3).max(320).toLowerCase().pipe(z.email()).optional(),
    state: z.string().min(1).max(256).optional(),
    response: z.custom<AuthenticationResponseJSON>((v) => typeof v === "object" && v !== null),
});

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
        checkRateLimit(rateKey(clientIp(request), "passkey"));
        const credentialId = body.response.id;
        if (!credentialId) return fail("Invalid credential", 400);
        const hint = request.cookies.get(config.portalCookie)?.value ?? null;
        const slugs = hint
            ? [hint, ...listPortalSlugs().filter((s) => s !== hint)]
            : listPortalSlugs();
        const candidates = await mapPortals(slugs, (db) =>
            db.query.passkeys.findMany({
                where: eq(passkeys.credentialId, credentialId),
                with: { user: true },
                limit: 1,
            }),
        );
        for (const candidate of candidates) {
            const stored = candidate?.value[0];
            if (!stored || !stored.user) continue;
            const db = candidate.db;
            const slug = candidate.slug;
            if (body.email && stored.user.email.toLowerCase() !== body.email)
                return fail("Invalid credential", 400);
            let pending;
            if (body.state) {
                const rows = await db
                    .select()
                    .from(authPending)
                    .where(
                        and(
                            eq(authPending.provider, "passkey-login"),
                            eq(authPending.state, body.state),
                            or(isNull(authPending.portal), eq(authPending.portal, slug)),
                        ),
                    )
                    .limit(1);
                pending = rows[0];
            } else {
                const rows = await db.query.authPending.findMany({
                    where: and(
                        eq(authPending.provider, "passkey-login"),
                        eq(authPending.email, stored.user.email),
                        or(isNull(authPending.portal), eq(authPending.portal, slug)),
                        gt(authPending.expiresAt, new Date()),
                    ),
                    orderBy: [desc(authPending.createdAt)],
                    limit: 1,
                });
                pending = rows[0];
            }
            if (!pending || pending.expiresAt.getTime() < Date.now() || !pending.nonce) {
                return fail("Login session expired", 400);
            }
            const result = await verifyAuthenticationResponse({
                response: body.response,
                expectedChallenge: pending.nonce,
                expectedOrigin: expectedOrigin(),
                expectedRPID: rpId(),
                credential: {
                    id: stored.credentialId,
                    publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
                    counter: stored.counter,
                    transports: (stored.transports ?? []) as AuthenticatorTransport[],
                },
            });
            if (!result.verified) return fail("Authentication failed", 400);
            const nextCounter = result.authenticationInfo.newCounter;
            if (nextCounter > 0 || stored.counter > 0) {
                if (nextCounter <= stored.counter) return fail("Authentication failed", 400);
            }
            await db
                .update(passkeys)
                .set({ counter: nextCounter })
                .where(eq(passkeys.id, stored.id));
            await db.delete(authPending).where(eq(authPending.id, pending.id));
            try {
                const login = await createSessionForUser({
                    slug: pending.portal,
                    provider: "passkey",
                    email: stored.user.email,
                    ip: clientIp(request),
                    userAgent: request.headers.get("user-agent"),
                });
                return sessionJsonResponse(login.token, login.portal, { verified: true });
            } catch (e) {
                if (e instanceof AccessDenied) return apiError("AccessDenied", 403);
                throw e;
            }
        }
        return fail("Invalid credential", 400);
    } catch (e) {
        return handleRouteError("auth/passkey/login-verify", e);
    }
}
