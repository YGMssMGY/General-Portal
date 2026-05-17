import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { errorHandler } from "../middleware/error.js";

vi.mock("../lib/db.js", () => {
  const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi
      .fn()
      .mockImplementation((args: any) =>
        Promise.resolve({ id: "mock-task-id", ...args?.data }),
      ),
    update: vi.fn().mockResolvedValue({ id: "mock-task-id" }),
    delete: vi.fn().mockResolvedValue({ id: "mock-task-id" }),
    findFirstOrThrow: vi.fn().mockRejectedValue(new Error("Not found")),
  });
  return {
    db: {
      taskItem: m(),
      taskSubtask: m(),
      taskComment: m(),
      taskAttachment: m(),
    },
  };
});

import tasksRoute from "./tasks.js";

const rejectAll = createMiddleware(async (c) => {
  return c.json({ error: "Unauthorized" }, 401);
});

const mockWorkspace = createMiddleware(async (c, next) => {
  c.set("workspaceId", "test-ws-id");
  await next();
});

describe("Tasks", () => {
  it("GET /api/tasks returns 401 without auth", async () => {
    const app = new Hono();
    app.use("/api/*", rejectAll);
    app.route("/api", tasksRoute);
    const res = await app.request("/api/tasks");
    expect(res.status).toBe(401);
  });

  it("POST /api/tasks without body returns 400 (Zod validation)", async () => {
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", tasksRoute);
    app.onError(errorHandler);
    const res = await app.request("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("code", "VALIDATION_ERROR");
  });

  it("GET /api/tasks with valid workspace returns 200 with array", async () => {
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", tasksRoute);
    const res = await app.request("/api/tasks");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
