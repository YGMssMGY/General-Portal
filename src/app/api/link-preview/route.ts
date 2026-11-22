import type { NextRequest } from "next/server";
import * as cheerio from "cheerio";
import { ApiError, fail, handleRouteError, ok } from "@/lib/api";
import { sensitiveLimitCheck } from "@/lib/rate-limit-guard";
import { fetchSafe } from "@/lib/ssrf";
import { requireTenant } from "@/lib/tenant";

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
        if (await sensitiveLimitCheck(request, "link-preview")) {
            return fail("Too many requests", 429);
        }

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

        const result = await fetchSafe(target.toString(), {
            method: "GET",
            timeoutMs: 10_000,
            maxBytes: 2 * 1024 * 1024,
        });
        if (result.blocked) throw new ApiError("Blocked", 400);
        if (!result.ok || result.status < 200 || result.status >= 400) {
            return fail("Failed to fetch URL", 502);
        }

        const $ = cheerio.load(result.text);
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
