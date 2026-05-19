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
        Promise.resolve({ id: "mock-budget-id", ...args?.data }),
      ),
    update: vi.fn().mockResolvedValue({ id: "mock-budget-id" }),
  });
  return { db: { budgetAllocation: m(), financeTransaction: m() } };
});

import budgetRoute from "./budget.js";

const rejectAll = createMiddleware(async (c) => {
  return c.json({ error: "Unauthorized" }, 401);
});

const mockDb = {
  budgetAllocation: {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: mockFindFirst,
    create: vi
      .fn()
      .mockImplementation((a: any) =>
        Promise.resolve({ id: "mock-budget-id", ...a?.data }),
      ),
    update: vi.fn().mockResolvedValue({ id: "mock-budget-id" }),
  },
  financeTransaction: {
    create: vi
      .fn()
      .mockImplementation((a: any) =>
        Promise.resolve({ id: "mock-tx-id", ...a?.data }),
      ),
  },
};
const mockWorkspace = createMiddleware(async (c, next) => {
  c.set("workspaceId", "test-ws-id");
  c.set("db", mockDb as any);
  await next();
});

describe("Budget", () => {
  it("GET /api/budget returns 401 without auth", async () => {
    const app = new Hono();
    app.use("/api/*", rejectAll);
    app.route("/api", budgetRoute);
    const res = await app.request("/api/budget");
    expect(res.status).toBe(401);
  });

  it("POST /api/budget returns 201", async () => {
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", budgetRoute);
    const res = await app.request("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Budget", amount: 500 }),
    });
    expect(res.status).toBe(201);
  });

  it("PATCH /api/budget/:id/approve returns 200", async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: "budget-1",
      workspaceId: "test-ws-id",
      title: "Test",
      amount: 500,
    });
    const app = new Hono();
    app.use("/api/*", mockWorkspace);
    app.route("/api", budgetRoute);
    const res = await app.request("/api/budget/budget-1/approve", {
      method: "PATCH",
    });
    expect(res.status).toBe(200);
  });
});
