import { NextRequest, NextResponse } from "next/server";
import { config } from "@/config";
import { clientIp, fail, handleRouteError } from "@/lib/api";
import { error as apiError } from "@/lib/api-response";
import { resolveLoginCallback } from "@/lib/auth/oidc";
import {
    AccessDenied,
    ContactAdmin,
    accessDeniedRedirect,
    callbackErrorRedirect,
    consumeAuthPending,
    createSessionForUser,
    readReturnTo,
    sessionRedirectResponse,
} from "@/lib/auth/session";
import { extractSamlEmail, extractSamlName, getSamlInstance } from "@/lib/auth/saml";

const OIDC_PROVIDERS = new Set(["microsoft-entra-id", "basis-auth", "google", "github", "oidc"]);

function portalHint(request: NextRequest): string | null {
    return request.cookies.get(config.portalCookie)?.value ?? null;
}

export async function handleOidcCallbackGet(
    request: NextRequest,
    provider: string,
): Promise<NextResponse> {
    if (!OIDC_PROVIDERS.has(provider)) return fail("Unknown provider", 404);
    const returnTo = readReturnTo(request);
    try {
        const identity = await resolveLoginCallback(provider, request.url, portalHint(request));
        const login = await createSessionForUser({
            slug: identity.portal,
            provider,
            email: identity.email,
            name: identity.name,
            image: identity.image,
            sub: identity.sub,
            ip: clientIp(request),
            userAgent: request.headers.get("user-agent"),
        });
        return sessionRedirectResponse(login.token, login.portal, returnTo);
    } catch (e) {
        if (e instanceof AccessDenied) return accessDeniedRedirect();
        if (e instanceof ContactAdmin) return apiError(e.message, 403);
        throw e;
    }
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
    try {
        const { provider } = await ctx.params;
        return await handleOidcCallbackGet(request, provider);
    } catch (e) {
        return handleRouteError("auth/callback", e);
    }
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
    try {
        const { provider } = await ctx.params;
        if (provider !== "saml") return fail("Method not allowed", 405);
        const returnTo = readReturnTo(request);
        try {
            const form = await request.formData();
            const samlResponse = String(form.get("SAMLResponse") ?? "");
            const relayState = String(form.get("RelayState") ?? "");
            if (!samlResponse || !relayState) return accessDeniedRedirect();
            const found = await consumeAuthPending("saml", relayState, portalHint(request));
            if (!found) return accessDeniedRedirect();
            if (found.pending.expiresAt.getTime() < Date.now()) return callbackErrorRedirect();
            const saml = getSamlInstance();
            const { profile } = await saml.validatePostResponseAsync({
                SAMLResponse: samlResponse,
                RelayState: relayState,
            });
            if (!profile) return accessDeniedRedirect();
            const email = extractSamlEmail(profile);
            if (!email) return accessDeniedRedirect();
            const login = await createSessionForUser({
                slug: found.pending.portal,
                provider: "saml",
                email,
                name: extractSamlName(profile),
                sub: profile.nameID ?? null,
                ip: clientIp(request),
                userAgent: request.headers.get("user-agent"),
            });
            return sessionRedirectResponse(login.token, login.portal, returnTo);
        } catch (e) {
            if (e instanceof AccessDenied) return accessDeniedRedirect();
            if (e instanceof ContactAdmin) return apiError(e.message, 403);
            throw e;
        }
    } catch (e) {
        return handleRouteError("auth/callback/saml", e);
    }
}
