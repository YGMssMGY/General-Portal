import type { NextRequest } from "next/server";
import { getPool, listPortalSlugs } from "@/db/client";
import { config } from "@/config";
import { clientIp } from "./api";
import { consumeRateLimit, type RateLimitResult } from "./rate-limit";

const sensitiveLimit = Math.max(60, config.rateLimitMax);

export async function sensitiveLimitCheck(
    request: NextRequest,
    bucket: string,
): Promise<RateLimitResult | null> {
    const slug = listPortalSlugs()[0];
    if (!slug) return null;
    try {
        const result = await consumeRateLimit(
            getPool(slug),
            `${bucket}:${clientIp(request)}`,
            sensitiveLimit,
            60_000,
        );
        return result.allowed ? null : result;
    } catch {
        return null;
    }
}
