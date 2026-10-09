import { lt } from "drizzle-orm";
import * as client from "openid-client";
import { getDb, type PortalDb } from "@/db/client";
import { authPending } from "@/db/schema";
import { config } from "@/config";
import { ApiError } from "@/lib/api";
import { callbackUrlFor, unavailable } from "@/lib/auth/providers";
import { consumeAuthPending } from "@/lib/auth/session";

const discoveryCache = new Map<string, { conf: client.Configuration; at: number }>();
const DISCOVERY_TTL_MS = 5 * 60 * 1000;

export interface IssuerMeta {
    issuer: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export function issuerMeta(provider: string): IssuerMeta {
    switch (provider) {
        case "basis-auth": {
            const b = config.basisAuth;
            if (
                !b.issuer.trim() ||
                !b.clientId.trim() ||
                !b.clientSecret.trim() ||
                !b.redirectUri.trim() ||
                !b.resource.trim()
            ) {
                throw new ApiError(unavailable, 503);
            }
            return {
                issuer: b.issuer,
                clientId: b.clientId,
                clientSecret: b.clientSecret,
                redirectUri: b.redirectUri,
            };
        }
        case "microsoft-entra-id": {
            if (!config.entra.clientId.trim() || !config.entra.clientSecret.trim())
                throw new ApiError(unavailable, 503);
            return {
                issuer: `https://login.microsoftonline.com/${config.entra.tenantId.trim() || "common"}/v2.0`,
                clientId: config.entra.clientId,
                clientSecret: config.entra.clientSecret,
                redirectUri: callbackUrlFor(provider),
            };
        }
        case "google": {
            if (!config.google.clientId.trim() || !config.google.clientSecret.trim())
                throw new ApiError(unavailable, 503);
            return {
                issuer: "https://accounts.google.com",
                clientId: config.google.clientId,
                clientSecret: config.google.clientSecret,
                redirectUri: callbackUrlFor(provider),
            };
        }
        case "github": {
            if (!config.github.clientId.trim() || !config.github.clientSecret.trim())
                throw new ApiError(unavailable, 503);
            return {
                issuer: "https://github.com",
                clientId: config.github.clientId,
                clientSecret: config.github.clientSecret,
                redirectUri: callbackUrlFor(provider),
            };
        }
        case "oidc": {
            if (
                !config.oidc.issuer.trim() ||
                !config.oidc.clientId.trim() ||
                !config.oidc.clientSecret.trim()
            ) {
                throw new ApiError(unavailable, 503);
            }
            return {
                issuer: config.oidc.issuer,
                clientId: config.oidc.clientId,
                clientSecret: config.oidc.clientSecret,
                redirectUri: config.oidc.redirectUri.trim() || callbackUrlFor(provider),
            };
        }
        default:
            throw new ApiError("Unknown provider", 404);
    }
}

async function getOidcConfiguration(
    provider: string,
    meta: IssuerMeta,
): Promise<client.Configuration> {
    const cached = discoveryCache.get(provider);
    if (cached && Date.now() - cached.at < DISCOVERY_TTL_MS) return cached.conf;
    const redirectUris =
        provider === "basis-auth"
            ? [
                  meta.redirectUri,
                  `${config.baseUrl}/api/auth/bcallback`,
                  `${config.baseUrl}/api/auth/callback/basis-auth`,
              ]
            : [meta.redirectUri];
    const conf = await client.discovery(
        new URL(meta.issuer),
        meta.clientId,
        { redirect_uris: redirectUris, scope: "openid profile email" },
        client.ClientSecretPost(meta.clientSecret),
    );
    discoveryCache.set(provider, { conf, at: Date.now() });
    return conf;
}

async function prunePending(db: PortalDb): Promise<void> {
    try {
        await db.delete(authPending).where(lt(authPending.expiresAt, new Date()));
    } catch {
        return;
    }
}

export async function startLoginUrl(provider: string, portal: string): Promise<string> {
    const db = getDb(portal);
    const meta = issuerMeta(provider);
    const state = client.randomState();
    const nonce = client.randomNonce();
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const resource = provider === "basis-auth" ? config.basisAuth.resource : null;
    let url: string;
    if (provider === "github") {
        const u = new URL("https://github.com/login/oauth/authorize");
        u.searchParams.set("client_id", meta.clientId);
        u.searchParams.set("redirect_uri", meta.redirectUri);
        u.searchParams.set("scope", "read:user user:email");
        u.searchParams.set("state", state);
        u.searchParams.set("code_challenge", codeChallenge);
        u.searchParams.set("code_challenge_method", "S256");
        url = u.toString();
    } else {
        const conf = await getOidcConfiguration(provider, meta);
        const params: Record<string, string> = {
            redirect_uri: meta.redirectUri,
            scope: "openid profile email",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            state,
            nonce,
        };
        if (resource) params.resource = resource;
        url = client.buildAuthorizationUrl(conf, params).toString();
    }
    await prunePending(db);
    await db.insert(authPending).values({
        provider,
        state,
        nonce,
        codeVerifier,
        portal,
        redirectUri: meta.redirectUri,
        resource,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    return url;
}

export interface ResolvedIdentity {
    sub: string;
    email: string;
    name: string | null;
    image: string | null;
    portal: string;
}

async function finishOidc(
    provider: string,
    pending: typeof authPending.$inferSelect,
    currentUrl: URL,
): Promise<ResolvedIdentity> {
    const meta = issuerMeta(provider);
    const conf = await getOidcConfiguration(provider, meta);
    const tokens = await client.authorizationCodeGrant(
        conf,
        currentUrl,
        {
            pkceCodeVerifier: pending.codeVerifier ?? undefined,
            expectedState: pending.state,
            expectedNonce: pending.nonce ?? undefined,
        },
        provider === "basis-auth" && pending.resource ? { resource: pending.resource } : undefined,
    );
    const claims = tokens.claims();
    if (!claims?.sub) throw new ApiError("Invalid login response", 400);
    const userinfo = await client.fetchUserInfo(conf, tokens.access_token, claims.sub);
    const email = typeof userinfo.email === "string" ? userinfo.email : null;
    if (!email) throw new ApiError("Invalid login response", 400);
    return {
        sub: claims.sub,
        email,
        name: typeof userinfo.name === "string" ? userinfo.name : null,
        image: typeof userinfo.picture === "string" ? userinfo.picture : null,
        portal: pending.portal,
    };
}

async function finishGithub(
    pending: typeof authPending.$inferSelect,
    currentUrl: URL,
): Promise<ResolvedIdentity> {
    const meta = issuerMeta("github");
    const code = currentUrl.searchParams.get("code");
    if (!code) throw new ApiError("Invalid login response", 400);
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: meta.clientId,
            client_secret: meta.clientSecret,
            code,
            redirect_uri: pending.redirectUri,
            code_verifier: pending.codeVerifier,
        }),
    });
    if (!tokenRes.ok) throw new ApiError(unavailable, 503);
    const tokenJson = (await tokenRes.json()) as { access_token?: string };
    if (!tokenJson.access_token) throw new ApiError(unavailable, 503);
    const headers = {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenJson.access_token}`,
        "User-Agent": "general-portal",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    const meRes = await fetch("https://api.github.com/user", { headers });
    if (!meRes.ok) throw new ApiError(unavailable, 503);
    const me = (await meRes.json()) as {
        id: number;
        login: string;
        name?: string | null;
        avatar_url?: string | null;
        email?: string | null;
    };
    let email = me.email ?? null;
    if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
        if (emailsRes.ok) {
            const emails = (await emailsRes.json()) as Array<{
                email: string;
                primary: boolean;
                verified: boolean;
            }>;
            email =
                emails.find((e) => e.primary && e.verified)?.email ??
                emails.find((e) => e.verified)?.email ??
                null;
        }
    }
    if (!email) throw new ApiError("Invalid login response", 400);
    return {
        sub: String(me.id),
        email,
        name: me.name ?? me.login,
        image: me.avatar_url ?? null,
        portal: pending.portal,
    };
}

export async function resolveLoginCallback(
    provider: string,
    requestUrl: string,
    portalHint: string | null,
): Promise<ResolvedIdentity> {
    const currentUrl = new URL(requestUrl);
    if (currentUrl.searchParams.get("error")) throw new ApiError("Sign-in was cancelled", 400);
    const state = currentUrl.searchParams.get("state");
    if (!state) throw new ApiError("Invalid login response", 400);
    const found = await consumeAuthPending(provider, state, portalHint);
    if (!found) throw new ApiError("Invalid login response", 400);
    if (found.pending.expiresAt.getTime() < Date.now())
        throw new ApiError("Login session expired", 400);
    if (provider === "github") return finishGithub(found.pending, currentUrl);
    return finishOidc(provider, found.pending, currentUrl);
}
