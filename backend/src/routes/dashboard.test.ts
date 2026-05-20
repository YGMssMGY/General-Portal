import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

vi.mock("../lib/db.js", () => {
	const m = () => ({
		findMany: vi.fn().mockResolvedValue([]),
		findFirst: vi.fn().mockResolvedValue(null),
		groupBy: vi.fn().mockResolvedValue([]),
		count: vi.fn().mockResolvedValue(0),
		aggregate: vi.fn().mockResolvedValue({ _sum: { unreadCount: 0 } }),
		create: vi.fn().mockResolvedValue({ id: "mock-id" }),
	});
	return {
		db: {
			taskItem: m(),
			eventItem: m(),
			activityLog: m(),
			financeTransaction: m(),
			messageThread: m(),
			proposal: m(),
			membership: m(),
			$transaction: vi
				.fn()
				.mockImplementation(async (queries: any[]) => Promise.all(queries)),
		},
	};
});

import dashboardRoute from "./dashboard.js";

const rejectAll = createMiddleware(async (c) => {
	return c.json({ error: "Unauthorized" }, 401);
});

const m = () => ({
	findMany: vi.fn().mockResolvedValue([]),
	findFirst: vi.fn().mockResolvedValue(null),
	groupBy: vi.fn().mockResolvedValue([]),
	count: vi.fn().mockResolvedValue(0),
	aggregate: vi.fn().mockResolvedValue({ _sum: { unreadCount: 0 } }),
	create: vi.fn().mockResolvedValue({ id: "mock-id" }),
});
const mockDb = {
	taskItem: m(),
	eventItem: m(),
	activityLog: m(),
	financeTransaction: m(),
	messageThread: m(),
	proposal: m(),
	membership: m(),
	$transaction: vi.fn().mockImplementation(async (queries: any[]) => Promise.all(queries)),
};
const mockWorkspace = createMiddleware(async (c, next) => {
	c.set("workspaceId", "test-ws-id");
	c.set("db", mockDb as any);
	await next();
});

describe("Dashboard", () => {
	it("GET /api/dashboard returns 401 without auth", async () => {
		const app = new Hono();
		app.use("/api/*", rejectAll);
		app.route("/api", dashboardRoute);
		const res = await app.request("/api/dashboard");
		expect(res.status).toBe(401);
	});

	it("GET /api/dashboard returns 200 with mock auth", async () => {
		const app = new Hono();
		app.use("/api/*", mockWorkspace);
		app.route("/api", dashboardRoute);
		const res = await app.request("/api/dashboard");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveProperty("metrics");
		expect(body).toHaveProperty("myTasks");
		expect(body).toHaveProperty("topContributor");
	});
});
