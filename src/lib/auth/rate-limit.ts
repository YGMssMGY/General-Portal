import { ApiError } from "@/lib/api";

const buckets = new Map<string, { count: number; reset: number }>();

export function rateKey(ip: string, provider: string): string {
    return `${ip}:${provider}`;
}

export function checkRateLimit(key: string, max = 10, windowMs = 60_000): void {
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || now >= current.reset) {
        buckets.set(key, { count: 1, reset: now + windowMs });
    } else {
        current.count += 1;
        if (current.count > max) throw new ApiError("Too many requests", 429);
    }
    if (buckets.size > 20000) {
        for (const [k, v] of buckets) {
            if (now >= v.reset) buckets.delete(k);
            if (buckets.size <= 10000) break;
        }
    }
}
