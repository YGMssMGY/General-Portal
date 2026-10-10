import { z } from "zod";
import { config } from "@/config";
import { logger } from "@/lib/logger";

export const providerIds = [
    "microsoft-entra-id",
    "basis-auth",
    "google",
    "github",
    "oidc",
    "saml",
    "password",
    "email-otp",
    "passkey",
] as const;

export type ProviderId = (typeof providerIds)[number];

const portalAuthSchema = z.object({
    providers: z.array(z.string()).default(["microsoft-entra-id", "basis-auth"]),
    allowedDomains: z.array(z.string()).default([]),
});

export type PortalAuthConfig = z.infer<typeof portalAuthSchema>;

function isKnownProvider(v: string): boolean {
    return (providerIds as readonly string[]).includes(v);
}

export function getPortalAuthConfig(slug: string): PortalAuthConfig {
    const envKey = `AUTH_PROVIDERS_${slug.toUpperCase().replace(/-/g, "_")}`;
    // Dynamic per-portal keys cannot be statically typed in @/config; read here.
    // eslint-disable-next-line no-restricted-properties
    const rawProviders = process.env[envKey];
    // eslint-disable-next-line no-restricted-properties
    const rawDomains = process.env.ALLOWED_DOMAINS ?? "";
    return portalAuthSchema.parse({
        providers:
            rawProviders === undefined
                ? undefined
                : rawProviders
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s !== "" && isKnownProvider(s)),
        allowedDomains: rawDomains
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter((s) => s !== ""),
    });
}

function present(...values: string[]): boolean {
    return values.every((v) => v.trim() !== "");
}

export function enabledProviders(): Set<string> {
    const out = new Set<string>(["password", "passkey"]);
    if (present(config.entra.clientId, config.entra.clientSecret)) out.add("microsoft-entra-id");
    if (
        present(
            config.basisAuth.issuer,
            config.basisAuth.clientId,
            config.basisAuth.clientSecret,
            config.basisAuth.redirectUri,
            config.basisAuth.resource,
        )
    ) {
        out.add("basis-auth");
    }
    if (present(config.google.clientId, config.google.clientSecret)) out.add("google");
    if (present(config.github.clientId, config.github.clientSecret)) out.add("github");
    if (present(config.oidc.issuer, config.oidc.clientId, config.oidc.clientSecret))
        out.add("oidc");
    if (present(config.saml.entryPoint, config.saml.issuer, config.saml.cert)) out.add("saml");
    if (present(config.smtp.host, config.smtp.from)) out.add("email-otp");
    return out;
}

const warned = new Set<string>();

export function portalProviders(slug: string): string[] {
    const cfg = getPortalAuthConfig(slug);
    const enabled = enabledProviders();
    const out: string[] = [];
    for (const p of cfg.providers) {
        if (enabled.has(p)) {
            out.push(p);
        } else {
            const key = `${slug}:${p}`;
            if (!warned.has(key)) {
                warned.add(key);
                logger.warn(
                    { portal: slug, provider: p },
                    "configured auth provider is not enabled (missing env)",
                );
            }
        }
    }
    for (const p of ["password", "passkey", "email-otp"] as const) {
        if (enabled.has(p) && !out.includes(p)) out.push(p);
    }
    return out;
}

export function isProviderAllowed(slug: string, provider: string): boolean {
    return portalProviders(slug).includes(provider);
}

export function callbackUrlFor(provider: string): string {
    if (provider === "basis-auth") return config.basisAuth.redirectUri;
    return `${config.baseUrl}/api/auth/callback/${provider}`;
}

export function samlCallbackUrl(): string {
    return `${config.baseUrl}/api/auth/callback/saml`;
}

export function rpId(): string {
    return new URL(config.baseUrl).hostname;
}

export function expectedOrigin(): string {
    return new URL(config.baseUrl).origin;
}

export function secureCookies(): boolean {
    return config.baseUrl.startsWith("https");
}

export function emailAllowed(email: string, allowedDomains: string[]): boolean {
    if (allowedDomains.length === 0) return true;
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    return allowedDomains.includes(domain);
}

export const unavailable = "Sign-in is unavailable right now";
