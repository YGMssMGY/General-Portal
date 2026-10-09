import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { authPending } from "@/db/schema";
import { config } from "@/config";
import { ApiError, clientIp, fail, handleRouteError } from "@/lib/api";
import { startLoginUrl } from "@/lib/auth/oidc";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { isProviderAllowed, providerIds } from "@/lib/auth/providers";
import { returnToCookieHeader } from "@/lib/auth/session";
import { getSamlInstance } from "@/lib/auth/saml";
import { resolvePortalSlug } from "@/lib/tenant";

const FLOW_PROVIDERS = new Set([
    "microsoft-entra-id",
    "basis-auth",
    "google",
    "github",
    "oidc",
    "saml",
]);

function validReturnTo(v: string | null): string | null {
    if (!v) return null;
    if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) return v;
    return null;
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
    try {
        const { provider } = await ctx.params;
        if (!(providerIds as readonly string[]).includes(provider))
            return fail("Unknown provider", 404);
        if (!FLOW_PROVIDERS.has(provider)) return fail("Use the sign-in form for this method", 400);
        const portal = resolvePortalSlug(request);
        checkRateLimit(rateKey(clientIp(request), provider));
        if (!isProviderAllowed(portal, provider)) {
            return NextResponse.redirect(new URL("/login?error=AccessDenied", config.baseUrl));
        }
        const returnTo = validReturnTo(new URL(request.url).searchParams.get("callbackUrl"));
        let target: string;
        if (provider === "saml") {
            const saml = getSamlInstance();
            const relayState = randomBytes(16).toString("base64url");
            const db = getDb(portal);
            await db.insert(authPending).values({
                provider: "saml",
                state: relayState,
                portal,
                redirectUri: `${config.baseUrl}/api/auth/callback/saml`,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            });
            target = await saml.getAuthorizeUrlAsync(relayState, config.baseUrl, {});
        } else {
            target = await startLoginUrl(provider, portal);
        }
        const res = NextResponse.redirect(target);
        if (returnTo) res.headers.append("Set-Cookie", returnToCookieHeader(returnTo));
        return res;
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) return fail(e.message, 404);
        return handleRouteError("auth/login", e);
    }
}
