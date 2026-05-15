import { describe, it, expect } from "vitest";
import { env } from "./env.js";

describe("Environment defaults", () => {
  it("default PORT is 3001", () => {
    expect(env.PORT).toBe(3001);
  });

  it("default AUTH_URL is http://localhost:5173", () => {
    expect(env.AUTH_URL).toBe("http://localhost:5173");
  });

  it("default FRONTEND_ORIGIN is http://localhost:5173", () => {
    expect(env.FRONTEND_ORIGIN).toBe("http://localhost:5173");
  });
});
