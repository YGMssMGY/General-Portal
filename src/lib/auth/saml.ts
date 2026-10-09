import { SAML } from "@node-saml/node-saml";
import type { Profile } from "@node-saml/node-saml";
import { config } from "@/config";
import { ApiError } from "@/lib/api";
import { samlCallbackUrl, unavailable } from "@/lib/auth/providers";

export function requireSamlOptions(): {
    entryPoint: string;
    issuer: string;
    cert: string;
    callbackUrl: string;
} {
    const entryPoint = config.saml.entryPoint.trim();
    const issuer = config.saml.issuer.trim();
    const cert = config.saml.cert.trim();
    if (!entryPoint || !issuer || !cert) throw new ApiError(unavailable, 503);
    return { entryPoint, issuer, cert: cert.replace(/\\n/g, "\n"), callbackUrl: samlCallbackUrl() };
}

export function getSamlInstance(): SAML {
    const opts = requireSamlOptions();
    return new SAML({
        entryPoint: opts.entryPoint,
        issuer: opts.issuer,
        callbackUrl: opts.callbackUrl,
        idpCert: opts.cert,
    });
}

function firstString(v: unknown): string | null {
    if (typeof v === "string" && v.trim() !== "") return v.trim();
    if (Array.isArray(v)) {
        for (const item of v) {
            const s = firstString(item);
            if (s) return s;
        }
    }
    return null;
}

export function extractSamlEmail(profile: Profile): string | null {
    const direct = firstString(profile.email) ?? firstString(profile.mail);
    if (direct) return direct;
    const keys = [
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        "urn:oid:0.9.2342.19200300.100.1.3",
        "email",
        "mail",
        "emailAddress",
    ];
    for (const key of keys) {
        const s = firstString(profile[key]);
        if (s) return s;
    }
    const nameId = profile.nameID?.trim() ?? "";
    return nameId.includes("@") ? nameId : null;
}

export function extractSamlName(profile: Profile): string | null {
    const keys = [
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "displayName",
        "cn",
        "name",
    ];
    for (const key of keys) {
        const s = firstString(profile[key]);
        if (s) return s;
    }
    return null;
}
