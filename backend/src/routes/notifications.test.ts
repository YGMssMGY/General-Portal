import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn().mockResolvedValue(null),
}));

vi.mock("../lib/db.js", () => {
  const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: mockFindFirst,
    update: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  });
  return { db: { notification: m() } };
});

vi.mock("@hono/auth-js", () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    token: { id: "test-user-id", name: "Test User" },
  }),
}));

import notificationsRoute from "./notifications.js";

const rejectAll = createMiddleware(async (c) => {
  return c.json({ error: "Unauthorized" }, 401);
});

const mockDb = {
  notification: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: mockFindFirst,
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    update: vi.fn().mockResolvedValue({ id: "mock-notif-id" }),
  },
};
const mockWorkspace = createMiddleware(async (c, next) => {
  c.set("workspaceId", "test-ws-id");
  c.set("db", mockDb as any);
  c.set("userId", "test-user-id");
  await next();
});

describe("Notifications", () => {
  it("GET /api/notifications returns 401 without auth", async () => {
    const app = new Hono();
    app.use("/api/*", rejectAll);
    app.route("/api", notificationsRoute);
    const res = await app.request("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("PATCH /api/notifications/:id/read returns 200", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "notif-1",
      isRead: false,
      userId: "test-user-id",
    });
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", notificationsRoute);
    const res = await app.request("/api/notifications/notif-1/read", {
      method: "PATCH",
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("success", true);
  });
});
