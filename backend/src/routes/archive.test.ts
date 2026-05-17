import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

vi.mock("../lib/db.js", () => {
  const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: "mock-term-id", ...args?.data }),
      ),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  });
  return {
    db: {
      termArchive: m(),
      taskItem: m(),
      proposal: m(),
      eventItem: m(),
      membership: m(),
      notification: m(),
      userAccount: m(),
    },
  };
});

vi.mock("@hono/auth-js", () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    token: {
      id: "admin-id",
      name: "Admin",
      role: "admin",
      workspaceId: "test-ws-id",
    },
  }),
}));

import archiveRoute from "./archive.js";

const rejectAll = createMiddleware(async (c) => {
  return c.json({ error: "Unauthorized" }, 401);
});

const mockWorkspace = createMiddleware(async (c, next) => {
  c.set("workspaceId", "test-ws-id");
  await next();
});

describe("Archive", () => {
  it("GET /api/archive returns 401 without auth", async () => {
    const app = new Hono();
    app.use("/api/*", rejectAll);
    app.route("/api", archiveRoute);
    const res = await app.request("/api/archive");
    expect(res.status).toBe(401);
  });

  it("GET /api/archive returns 200", async () => {
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", archiveRoute);
    const res = await app.request("/api/archive");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
