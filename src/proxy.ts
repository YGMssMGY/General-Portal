import { NextResponse, type NextRequest } from "next/server";
import { config as appConfig } from "./config";
import { routing } from "./i18n/routing";
import { clientIp } from "./lib/client-ip";

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|woff2?)$).*)"],
};

const LOCALE_COOKIE = "NEXT_LOCALE";

function makeNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    let s = "";
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
}

function contentSecurityPolicy(nonce: string): string {
    return (
        "default-src 'self'; " +
        `script-src 'self' 'nonce-${nonce}'; ` +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    );
}

const SUPPORTED: readonly string[] = routing.locales;
const BASE_FALLBACK: Record<string, string> = {
    en: "en-US",
    zh: "zh-CN",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
};

const buckets = new Map<string, { count: number; reset: number }>();

function applySecurity(res: NextResponse, request: NextRequest, nonce: string): NextResponse {
    res.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce));
    const httpsSignal = request.headers.get("x-forwarded-proto") === "https";
    if (httpsSignal || (appConfig.nodeEnv === "production" && appConfig.trustProxy)) {
        res.headers.set(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains; preload",
        );
    }
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    return res;
}

function checkRateLimit(request: NextRequest): NextResponse | null {
    const path = request.nextUrl.pathname;
    const sensitive =
        path.startsWith("/api/auth/") || path === "/api/link-preview" || path === "/api/search";
    const limit = sensitive
        ? Math.max(10, Math.floor(appConfig.rateLimitMax / 10))
        : appConfig.rateLimitMax;
    const key = `${clientIp(request)}:${path}`;
    const now = Date.now();
    const slot = buckets.get(key);
    if (!slot || now >= slot.reset) {
        buckets.set(key, { count: 1, reset: now + 60_000 });
        if (buckets.size > 5000) {
            for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
            for (const k of buckets.keys()) {
                if (buckets.size < 4000) break;
                buckets.delete(k);
            }
        }
        return null;
    }
    if (slot.count >= limit) {
        const retryAfter = Math.max(1, Math.ceil((slot.reset - now) / 1000));
        return NextResponse.json(
            { success: false as const, error: "Too many requests" },
            { status: 429, headers: { "Retry-After": String(retryAfter) } },
        );
    }
    slot.count += 1;
    return null;
}

function csrfBlocked(request: NextRequest): boolean {
    const path = request.nextUrl.pathname;
    if (!path.startsWith("/api/")) return false;
    if (
        path.startsWith("/api/auth/callback/") ||
        path === "/api/auth/bcallback" ||
        path.startsWith("/api/auth/saml/")
    ) {
        return false;
    }
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method.toUpperCase())) return false;
    if (!request.cookies.get(appConfig.sessionCookie)?.value) return false;
    if (request.headers.get("authorization")?.startsWith("Bearer ")) return false;
    if (request.headers.get("sec-fetch-site") === "cross-site") return true;
    const origin = request.headers.get("origin");
    if (!origin) return false;
    try {
        return new URL(origin).host !== request.nextUrl.host;
    } catch {
        return true;
    }
}

function detectLocale(request: NextRequest): string {
    const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
    if (fromCookie && SUPPORTED.includes(fromCookie)) return fromCookie;
    const accept = request.headers.get("accept-language") ?? "";
    for (const part of accept.split(",")) {
        const tag = part.split(";")[0]?.trim();
        if (!tag) continue;
        if (SUPPORTED.includes(tag)) return tag;
        const base = tag.split("-")[0]?.toLowerCase();
        const fallback = base ? BASE_FALLBACK[base] : undefined;
        if (fallback && SUPPORTED.includes(fallback)) return fallback;
    }
    return routing.defaultLocale;
}

function pass(request: NextRequest): NextResponse {
    const locale = detectLocale(request);
    const nonce = makeNonce();
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-locale", locale);
    requestHeaders.set("x-nonce", nonce);
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
        res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 31536000, sameSite: "lax" });
    }
    return applySecurity(res, request, nonce);
}

export function proxy(request: NextRequest): NextResponse {
    const nonce = makeNonce();
    const limited = checkRateLimit(request);
    if (limited) return applySecurity(limited, request, nonce);

    if (csrfBlocked(request)) {
        return applySecurity(
            NextResponse.json({ success: false as const, error: "Forbidden" }, { status: 403 }),
            request,
            nonce,
        );
    }

    const path = request.nextUrl.pathname;
    if (
        path === "/" ||
        path === "/login" ||
        path === "/showcase" ||
        path === "/features" ||
        path === "/compare" ||
        path === "/changelog" ||
        path === "/roadmap" ||
        path === "/security" ||
        path === "/about" ||
        path === "/docs" ||
        path === "/demo" ||
        path.startsWith("/use-cases") ||
        path.startsWith("/api/auth/") ||
        path.startsWith("/api/public/") ||
        path === "/api/health" ||
        path === "/api/ops" ||
        path === "/api/ops/health" ||
        path === "/api/ops/openapi.json" ||
        path === "/api/ops/manifest.json" ||
        path === "/sitemap.xml" ||
        path === "/robots.txt" ||
        path === "/manifest.webmanifest" ||
        path === "/sw.js" ||
        path === "/offline.html" ||
        path.startsWith("/opengraph-image") ||
        path.startsWith("/twitter-image")
    ) {
        return pass(request);
    }
    if (path.startsWith("/api/")) {
        if (
            !request.cookies.get(appConfig.sessionCookie)?.value &&
            !request.headers.get("authorization")?.startsWith("Bearer ")
        ) {
            return applySecurity(
                NextResponse.json(
                    { success: false as const, error: "Unauthorized" },
                    { status: 401 },
                ),
                request,
                nonce,
            );
        }
        return pass(request);
    }
    if (!request.cookies.get(appConfig.sessionCookie)?.value) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = `?callbackUrl=${encodeURIComponent(path)}`;
        return applySecurity(NextResponse.redirect(url), request, nonce);
    }
    return pass(request);
}
