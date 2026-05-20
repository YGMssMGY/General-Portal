import { rateLimiter } from "hono-rate-limiter";

function rateLimitKey(c: any): string {
	const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
	const path = c.req.path || "/";
	return `${ip}:${path}`;
}

export const apiLimiter = rateLimiter({
	windowMs: 15 * 1000,
	limit: 100,
	standardHeaders: true,
	keyGenerator: rateLimitKey,
});

export const authLimiter = rateLimiter({
	windowMs: 15 * 1000,
	limit: 10,
	standardHeaders: true,
	keyGenerator: rateLimitKey,
});
