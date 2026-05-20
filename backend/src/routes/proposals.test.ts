import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

vi.mock("../lib/db.js", () => {
    const m = () => ({
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi
            .fn()
            .mockImplementation((args: any) =>
                Promise.resolve({ id: "mock-proposal-id", ...args?.data }),
            ),
        update: vi.fn().mockResolvedValue({ id: "mock-proposal-id" }),
        delete: vi.fn().mockResolvedValue({ id: "mock-proposal-id" }),
        findFirstOrThrow: vi.fn().mockRejectedValue(new Error("Not found")),
        groupBy: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
    });
    return {
        db: {
            proposal: m(),
            proposalAttachment: m(),
            membership: m(),
            user: m(),
            activityLog: m(),
            notification: m(),
        },
    };
});

import proposalsRoute from "./proposals.js";

const rejectAll = createMiddleware(async (c) => {
    return c.json({ error: "Unauthorized" }, 401);
});

const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi
        .fn()
        .mockImplementation((a: any) => Promise.resolve({ id: "mock-proposal-id", ...a?.data })),
    update: vi.fn().mockResolvedValue({ id: "mock-proposal-id" }),
    delete: vi.fn().mockResolvedValue({ id: "mock-proposal-id" }),
    findFirstOrThrow: vi.fn().mockRejectedValue(new Error("Not found")),
    groupBy: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
});
const mockDb = {
    proposal: m(),
    proposalAttachment: m(),
    membership: m(),
    user: m(),
    activityLog: m(),
    notification: m(),
};
const mockWorkspace = createMiddleware(async (c, next) => {
    c.set("workspaceId", "test-ws-id");
    c.set("db", mockDb as any);
    await next();
});

describe("Proposals", () => {
    it("GET /api/proposals returns 401 without auth", async () => {
        const app = new Hono();
        app.use("/api/*", rejectAll);
        app.route("/api", proposalsRoute);
        const res = await app.request("/api/proposals");
        expect(res.status).toBe(401);
    });

    it("POST /api/proposals returns 201", async () => {
        const app = new Hono();
        app.use("/api/*", mockWorkspace);
        app.route("/api", proposalsRoute);
        const res = await app.request("/api/proposals", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                title: "Test Proposal",
                type: "general",
                submittedBy: "testuser",
            }),
        });
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body).toHaveProperty("id");
    });

    it("GET /api/proposals returns 200 with array", async () => {
        const app = new Hono();
        app.use("/api/*", mockWorkspace);
        app.route("/api", proposalsRoute);
        const res = await app.request("/api/proposals");
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
    });
});
