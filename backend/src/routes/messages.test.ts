import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

vi.mock("../lib/db.js", () => {
  const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: "mock-thread-id", ...args?.data }),
      ),
    update: vi.fn().mockResolvedValue({ id: "mock-thread-id" }),
    delete: vi.fn().mockResolvedValue({ id: "mock-thread-id" }),
  });
  return { db: { messageThread: m(), message: m() } };
});

import messagesRoute from "./messages.js";

const rejectAll = createMiddleware(async (c) => {
  return c.json({ error: "Unauthorized" }, 401);
});

const m = () => ({
  findMany: vi.fn().mockResolvedValue([]),
  findUnique: vi.fn().mockResolvedValue(null),
  findFirst: vi.fn().mockResolvedValue(null),
  create: vi
    .fn()
    .mockImplementation((a: any) =>
      Promise.resolve({ id: "mock-id", ...a?.data }),
    ),
  update: vi.fn().mockResolvedValue({ id: "mock-id" }),
  delete: vi.fn().mockResolvedValue({ id: "mock-id" }),
});
const mockDb = {
  messageThread: m(),
  message: m(),
  messageParticipant: m(),
  messageAttachment: m(),
};
const mockWorkspace = createMiddleware(async (c, next) => {
  c.set("workspaceId", "test-ws-id");
  c.set("db", mockDb as any);
  await next();
});

describe("Messages", () => {
  it("GET /api/messages/threads returns 401 without auth", async () => {
    const app = new Hono();
    app.use("/api/*", rejectAll);
    app.route("/api", messagesRoute);
    const res = await app.request("/api/messages/threads");
    expect(res.status).toBe(401);
  });

  it("POST /api/messages/threads returns 201", async () => {
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", messagesRoute);
    const res = await app.request("/api/messages/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        body: "Hello",
        authorName: "Tester",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("id");
  });

  it("POST /api/messages/threads/:id/reply with bad id returns 404", async () => {
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", messagesRoute);
    const res = await app.request(
      "/api/messages/threads/nonexistent-id/reply",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "Reply text" }),
      },
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty("error", "Thread not found");
  });
});
