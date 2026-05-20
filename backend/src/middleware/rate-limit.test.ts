import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { rateLimiter } from "hono-rate-limiter";

describe("Rate limiter", () => {
    it("requests under limit pass through", async () => {
        const app = new Hono();
        app.use(
            rateLimiter({
                windowMs: 60_000,
                limit: 100,
                standardHeaders: true,
                keyGenerator: () => "test-key-1",
            }),
        );
        app.get("/test", (c) => c.text("OK"));

        const res = await app.request("/test");
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toBe("OK");
    });

    it("requests over limit return 429", async () => {
        const app = new Hono();
        app.use(
            rateLimiter({
                windowMs: 60_000,
                limit: 1,
                standardHeaders: true,
                keyGenerator: () => "test-key-2",
            }),
        );
        app.get("/test", (c) => c.text("OK"));

        const res1 = await app.request("/test");
        expect(res1.status).toBe(200);

        const res2 = await app.request("/test");
        expect(res2.status).toBe(429);
    });
});
