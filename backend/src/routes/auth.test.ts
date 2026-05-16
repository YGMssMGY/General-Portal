import { describe, it, expect, beforeAll } from "vitest";
import { Hono } from "hono";
import { authHandler } from "@hono/auth-js";
import { authConfig } from "../lib/auth-config.js";

describe("Auth endpoints", () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    app.use(authConfig);
    app.use("/api/auth/*", authHandler());
  });

  it("GET /api/auth/session returns null (no session)", async () => {
    const res = await app.request("/api/auth/session");
    expect(res.status).toBe(200);
    const body = await res.json();
    // Without a session cookie, should return null
    expect(body).toBeNull();
  });

  it("GET /api/auth/providers returns provider list", async () => {
    const res = await app.request("/api/auth/providers");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
    expect(typeof body).toBe("object");
    // Should have OAuth providers defined
    const providerIds = Object.keys(body);
    expect(providerIds.length).toBeGreaterThan(0);
  });

  it("GET /api/auth/csrf returns a csrf token", async () => {
    const res = await app.request("/api/auth/csrf");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("csrfToken");
    expect(typeof body.csrfToken).toBe("string");
  });
});
