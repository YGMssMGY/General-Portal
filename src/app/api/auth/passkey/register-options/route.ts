import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { generateRegistrationOptions, type AuthenticatorTransport } from "@simplewebauthn/server";
import { getDb } from "@/db/client";
import { authPending, passkeys } from "@/db/schema";
import { config } from "@/config";
import { ApiError, clientIp, fail, handleRouteError, ok } from "@/lib/api";
import { isProviderAllowed, rpId, unavailable } from "@/lib/auth/providers";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { getSession, resolvePortalSlug } from "@/lib/tenant";

export async function POST(request: NextRequest) {
    try {
        const portal = resolvePortalSlug(request);
        checkRateLimit(rateKey(clientIp(request), "passkey"));
        if (!isProviderAllowed(portal, "passkey")) throw new ApiError(unavailable, 503);
        const session = await getSession(request);
        if (!session) return fail("Unauthorized", 401);
        const db = getDb(portal);
        const existing = await db.query.passkeys.findMany({
            where: eq(passkeys.userId, session.user.id),
        });
        const options = await generateRegistrationOptions({
            rpName: "General Portal",
            rpID: rpId(),
            userName: session.user.email,
            userID: new TextEncoder().encode(session.user.id),
            excludeCredentials: existing.map((p) => ({
                id: p.credentialId,
                transports: (p.transports ?? []) as AuthenticatorTransport[],
            })),
            authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
        });
        const state = randomBytes(16).toString("base64url");
        await db.insert(authPending).values({
            provider: "passkey-register",
            state,
            nonce: options.challenge,
            email: session.user.email,
            portal,
            redirectUri: config.baseUrl,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        return ok({ options, state });
    } catch (e) {
        return handleRouteError("auth/passkey/register-options", e);
    }
}
