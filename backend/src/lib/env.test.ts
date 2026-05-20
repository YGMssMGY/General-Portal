import { describe, it, expect } from "vitest";
import { env } from "./env.js";

describe("Environment defaults", () => {
	it("default PORT is 30001 (dev backend)", () => {
		expect(env.PORT).toBe(30001);
	});

	it("default AUTH_URL is http://localhost:3000", () => {
		expect(env.AUTH_URL).toBe("http://localhost:3000");
	});

	it("default FRONTEND_ORIGIN is http://localhost:3000", () => {
		expect(env.FRONTEND_ORIGIN).toBe("http://localhost:3000");
	});

	it("default DATABASE_URL_DEVELOPERS points to localhost", () => {
		expect(env.DATABASE_URL_DEVELOPERS).toContain("localhost:5432");
	});

	it("default DATABASE_URL_STUCO points to localhost", () => {
		expect(env.DATABASE_URL_STUCO).toContain("localhost:5432");
	});

	it("NODE_ENV is set (vitest sets it to test)", () => {
		expect(env.NODE_ENV).toBeTruthy();
	});
});
