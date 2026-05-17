import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn().mockResolvedValue(null),
}));

vi.mock("@hono/auth-js", () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    token: { id: "test-user-id", name: "Test User" },
  }),
}));

vi.mock("../lib/db.js", () => {
  const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: mockFindFirst,
    create: vi
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: "mock-meeting-id", ...args?.data }),
      ),
    update: vi.fn().mockResolvedValue({ id: "mock-meeting-id" }),
    delete: vi.fn().mockResolvedValue({ id: "mock-meeting-id" }),
    upsert: vi
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: "mock-rsvp-id", ...args?.create }),
      ),
  });
  return { db: { meeting: m(), meetingRsvp: m() } };
});

import meetingsRoute from "./meetings.js";

const rejectAll = createMiddleware(async (c) => {
  return c.json({ error: "Unauthorized" }, 401);
});

const mockWorkspace = createMiddleware(async (c, next) => {
  c.set("workspaceId", "test-ws-id");
  await next();
});

describe("Meetings", () => {
  it("GET /api/meetings returns 401 without auth", async () => {
    const app = new Hono();
    app.use("/api/*", rejectAll);
    app.route("/api", meetingsRoute);
    const res = await app.request("/api/meetings");
    expect(res.status).toBe(401);
  });

  it("POST /api/meetings returns 201", async () => {
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", meetingsRoute);
    const res = await app.request("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Meeting",
        startsAt: "2026-06-01T10:00:00Z",
      }),
    });
    expect(res.status).toBe(201);
  });

  it("POST /api/meetings/:id/rsvp returns 201", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "existing-meeting",
      workspaceId: "test-ws-id",
    });
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", meetingsRoute);
    const res = await app.request("/api/meetings/mtg-1/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: "yes" }),
    });
    expect(res.status).toBe(201);
  });

  it("DELETE /api/meetings/:id returns 204", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "existing-meeting",
      workspaceId: "test-ws-id",
    });
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", meetingsRoute);
    const res = await app.request("/api/meetings/mtg-1", { method: "DELETE" });
    expect(res.status).toBe(204);
  });
});
