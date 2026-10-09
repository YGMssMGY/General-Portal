import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { generateAuthenticationOptions, type AuthenticatorTransport } from "@simplewebauthn/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { authPending, passkeys, users } from "@/db/schema";
import { config } from "@/config";
import { ApiError, clientIp, handleRouteError, ok, parseBody } from "@/lib/api";
import { isProviderAllowed, rpId, unavailable } from "@/lib/auth/providers";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { resolvePortalSlug } from "@/lib/tenant";

const optionsSchema = z.object({
    email: z.string().trim().min(3).max(320).toLowerCase().pipe(z.email()).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await parseBody(optionsSchema, request);
        const portal = resolvePortalSlug(request);
        checkRateLimit(rateKey(clientIp(request), "passkey"));
        if (!isProviderAllowed(portal, "passkey")) throw new ApiError(unavailable, 503);
        const db = getDb(portal);
        let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] | undefined;
        let email: string | null = null;
        if (body.email) {
            email = body.email;
            const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
            if (user) {
                const owned = await db.query.passkeys.findMany({
                    where: eq(passkeys.userId, user.id),
                });
                allowCredentials = owned.map((p) => ({
                    id: p.credentialId,
                    transports: (p.transports ?? []) as AuthenticatorTransport[],
                }));
            } else {
                allowCredentials = [];
            }
        }
        const options = await generateAuthenticationOptions({
            rpID: rpId(),
            allowCredentials,
            userVerification: "preferred",
        });
        const state = randomBytes(16).toString("base64url");
        await db.insert(authPending).values({
            provider: "passkey-login",
            state,
            nonce: options.challenge,
            email,
            portal,
            redirectUri: config.baseUrl,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        return ok({ options, state });
    } catch (e) {
        return handleRouteError("auth/passkey/login-options", e);
    }
}
