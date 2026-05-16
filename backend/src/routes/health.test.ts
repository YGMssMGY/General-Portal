import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import healthRoute from "./health.js";

describe("Health endpoint", () => {
  const app = new Hono().route("/api", healthRoute);

  it("returns 200 with status ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBe("0.1.0");
  });
});
