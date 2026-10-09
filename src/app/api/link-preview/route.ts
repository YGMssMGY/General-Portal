import { lookup } from "node:dns/promises";
import type { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import { ApiError, fail, handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const MAX_BYTES = 2 * 1024 * 1024;

function stripMapped(ip: string): string {
    return ip.startsWith("::ffff:") ? ip.slice("::ffff:".length) : ip;
}

function isBlockedIp(raw: string): boolean {
    const ip = stripMapped(raw);
    if (ip.includes(":")) {
        const lower = ip.toLowerCase();
        if (lower === "::1" || lower === "::") return true;
        if (/^fe[89ab]/i.test(lower)) return true;
        if (/^f[cd]/i.test(lower)) return true;
        if (/^ff/i.test(lower)) return true;
        return false;
    }
    const parts = ip.split(".");
    if (parts.length !== 4 || parts.some((p) => !/^\d+$/.test(p))) return true;
    const [a, b] = parts.map(Number);
    if (a === 0 || a === 127 || a === 10) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
    return false;
}

function resolveImage(src: string | undefined, base: URL): string | null {
    if (!src) return null;
    try {
        const u = new URL(src, base);
        if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
        return null;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        await requireTenant(request, {});

        const url = new URL(request.url).searchParams.get("url");
        if (!url) throw new ApiError("url query param is required", 400);

        let target: URL;
        try {
            target = new URL(url);
        } catch {
            throw new ApiError("Invalid URL", 400);
        }
        if (target.protocol !== "http:" && target.protocol !== "https:") {
            throw new ApiError("Only http/https URLs are allowed", 400);
        }

        let resolved: Array<{ address: string }>;
        try {
            resolved = await lookup(target.hostname, { all: true });
        } catch {
            return fail("Failed to fetch URL", 502);
        }
        if (resolved.length === 0 || resolved.some((r) => isBlockedIp(r.address))) {
            throw new ApiError("Blocked", 400);
        }

        let html: string;
        try {
            const res = await fetch(target.toString(), {
                signal: AbortSignal.timeout(10_000),
                headers: { "User-Agent": "General-Portal/1.0 LinkPreview" },
            });
            if (!res.ok) return fail("Failed to fetch URL", 502);
            const contentLength = res.headers.get("content-length");
            if (contentLength && Number(contentLength) > MAX_BYTES)
                return fail("Failed to fetch URL", 502);
            html = await res.text();
            if (html.length > MAX_BYTES) return fail("Failed to fetch URL", 502);
        } catch (e) {
            if (e instanceof ApiError) throw e;
            return fail("Failed to fetch URL", 502);
        }

        const $ = cheerio.load(html);
        const title =
            $('meta[property="og:title"]').attr("content") ||
            $('meta[name="twitter:title"]').attr("content") ||
            $("title").text() ||
            null;
        const description =
            $('meta[property="og:description"]').attr("content") ||
            $('meta[name="twitter:description"]').attr("content") ||
            $('meta[name="description"]').attr("content") ||
            null;
        const siteName =
            $('meta[property="og:site_name"]').attr("content") ||
            target.hostname.replace("www.", "") ||
            null;

        return ok({
            url: target.toString(),
            title: title?.slice(0, 200) ?? null,
            description: description?.slice(0, 400) ?? null,
            image: resolveImage(
                $('meta[property="og:image"]').attr("content") ||
                    $('meta[name="twitter:image"]').attr("content") ||
                    undefined,
                target,
            ),
            siteName: siteName?.slice(0, 100) ?? null,
        });
    } catch (e) {
        if (e instanceof ApiError) return handleRouteError("GET /api/link-preview", e);
        return fail("Failed to fetch URL", 502);
    }
}
