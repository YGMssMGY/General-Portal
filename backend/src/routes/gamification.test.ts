import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

const { mockFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn().mockResolvedValue(null),
}));

vi.mock("../lib/db.js", () => {
  const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: mockFindUnique,
    findFirst: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({ id: "mock-user-id" }),
    create: vi
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: "mock-id", ...args?.data }),
      ),
  });
  return { db: { membership: m(), userAccount: m(), notification: m() } };
});

vi.mock("@hono/auth-js", () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    token: { id: "test-user-id", name: "Test User" },
  }),
}));

import gamificationRoute from "./gamification.js";

const rejectAll = createMiddleware(async (c) => {
  return c.json({ error: "Unauthorized" }, 401);
});

const mockWorkspace = createMiddleware(async (c, next) => {
  c.set("workspaceId", "test-ws-id");
  await next();
});

describe("Gamification", () => {
  it("GET /api/gamification/leaderboard returns 401 without auth", async () => {
    const app = new Hono();
    app.use("/api/*", rejectAll);
    app.route("/api", gamificationRoute);
    const res = await app.request("/api/gamification/leaderboard");
    expect(res.status).toBe(401);
  });

  it("POST /api/gamification/check-streak returns 200", async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: "test-user-id",
      streak: 5,
      xp: 1200,
      level: 3,
      lastLoginAt: new Date(),
    });
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", gamificationRoute);
    const res = await app.request("/api/gamification/check-streak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("streak");
    expect(body).toHaveProperty("xp");
  });
});
