import { describe, it, expect, vi, afterAll } from "vitest";

vi.hoisted(() => {
  process.env["API_KEY"] = "test-api-key-123";
});

vi.mock("../lib/db.js", () => {
  const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
  });
  return { db: { taskItem: m(), eventItem: m(), proposal: m() } };
});

import { Hono } from "hono";
import publicApiRoute from "./public-api.js";

describe("Public API", () => {
  afterAll(() => {
    delete process.env["API_KEY"];
  });

  it("GET /api/v1/tasks with no API key returns 401", async () => {
    const app = new Hono();
    app.route("/api", publicApiRoute);
    const res = await app.request("/api/v1/tasks");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/tasks with wrong API key returns 401", async () => {
    const app = new Hono();
    app.route("/api", publicApiRoute);
    const res = await app.request("/api/v1/tasks", {
      headers: { Authorization: "Bearer wrong-key" },
    });
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/tasks with correct API key returns 200", async () => {
    const app = new Hono();
    app.route("/api", publicApiRoute);
    const res = await app.request("/api/v1/tasks", {
      headers: { Authorization: "Bearer test-api-key-123" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
  });
});
