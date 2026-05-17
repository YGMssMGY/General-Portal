import { rateLimiter } from "hono-rate-limiter";

export const apiLimiter = rateLimiter({
  windowMs: 15 * 1000,
  limit: 100,
  standardHeaders: true,
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "unknown",
});

export const authLimiter = rateLimiter({
  windowMs: 15 * 1000,
  limit: 10,
  standardHeaders: true,
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "unknown",
});
