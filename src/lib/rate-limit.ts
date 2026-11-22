import type { Pool } from "pg";

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
}

export async function consumeRateLimit(
    pool: Pool,
    key: string,
    maxTokens: number,
    windowMs: number,
): Promise<RateLimitResult> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);
    const res = await pool.query<{ tokens: number; updatedAt: Date | string }>(
        `INSERT INTO rate_buckets (key, tokens, "updatedAt")
         VALUES ($1, 1, $2)
         ON CONFLICT (key) DO UPDATE SET
             tokens = CASE
                 WHEN rate_buckets."updatedAt" < $3 THEN 1
                 ELSE rate_buckets.tokens + 1
             END,
             "updatedAt" = CASE
                 WHEN rate_buckets."updatedAt" < $3 THEN $2
                 ELSE rate_buckets."updatedAt"
             END
         RETURNING tokens, "updatedAt"`,
        [key, now, windowStart],
    );
    const row = res.rows[0];
    const used = row?.tokens ?? maxTokens + 1;
    const updatedAt =
        row?.updatedAt instanceof Date
            ? row.updatedAt.getTime()
            : new Date(row?.updatedAt ?? now).getTime();
    return {
        allowed: used <= maxTokens,
        remaining: Math.max(0, maxTokens - used),
        retryAfterMs: Math.max(0, updatedAt + windowMs - now.getTime()),
    };
}
