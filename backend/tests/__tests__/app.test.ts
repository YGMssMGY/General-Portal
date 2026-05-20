import { describe, it, expect } from "vitest";
import { createApp } from "../../src/lib/app.js";

describe("createApp()", () => {
	it("returns a Hono app with fetch method", () => {
		const app = createApp();
		expect(app).toBeDefined();
		expect(typeof app.fetch).toBe("function");
	});

	it("health endpoint returns 200 with status ok", async () => {
		const app = createApp();
		const res = await app.request("/api/health");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe("ok");
		expect(body.timestamp).toBeDefined();
		expect(body.version).toBeDefined();
	});

	it("returns 401 on protected routes without auth", async () => {
		const app = createApp();
		const res = await app.request("/api/tasks");
		expect(res.status).toBe(401);
	});

	it("returns 401 on finance route without auth", async () => {
		const app = createApp();
		const res = await app.request("/api/finance");
		expect(res.status).toBe(401);
	});

	it("returns 401 on members route without auth", async () => {
		const app = createApp();
		const res = await app.request("/api/members");
		expect(res.status).toBe(401);
	});

	it("returns 200 on public health route without auth", async () => {
		const app = createApp();
		const res = await app.request("/api/health");
		expect(res.status).toBe(200);
	});

	it("sets security headers (X-Frame-Options)", async () => {
		const app = createApp();
		const res = await app.request("/api/health");
		expect(res.headers.get("X-Frame-Options")).toBeTruthy();
	});

	it("sets security headers (X-Content-Type-Options)", async () => {
		const app = createApp();
		const res = await app.request("/api/health");
		expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
	});
});
