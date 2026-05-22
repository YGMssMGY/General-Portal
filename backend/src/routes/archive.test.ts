import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";

vi.mock("@hono/auth-js", () => ({
    getAuthUser: vi.fn().mockResolvedValue({
        token: {
            id: "admin-id",
            name: "Admin",
            role: "admin",
            workspaceId: "test-ws-id",
            permissions: ["*"],
        },
    }),
}));

vi.mock("../lib/db.js", () => {
    const m = () => ({
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi
            .fn()
            .mockImplementation((args: any) =>
                Promise.resolve({ id: "mock-term-id", ...args?.data }),
            ),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    });
    return {
        db: {
            termArchive: m(),
            taskItem: m(),
            proposal: m(),
            eventItem: m(),
            membership: m(),
            notification: m(),
            user: m(),
        },
    };
});

import archiveRoute from "./archive.js";

const rejectAll = createMiddleware(async (c) => {
    return c.json({ error: "Unauthorized" }, 401);
});

const m = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((a: any) => Promise.resolve({ id: "mock-id", ...a?.data })),
    update: vi.fn().mockResolvedValue({ id: "mock-id" }),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
});
const mockDb = {
    termArchive: m(),
    taskItem: m(),
    proposal: m(),
    eventItem: m(),
    membership: {
        findFirst: vi.fn().mockResolvedValue({
            id: "mem-id",
            userId: "admin-id",
            workspaceId: "test-ws-id",
            accessLabel: "admin",
        }),
    },
    user: m(),
};
const mockWorkspace = createMiddleware(async (c, next) => {
    c.set("workspaceId", "test-ws-id");
    c.set("db", mockDb as any);
    c.set("user", {
        id: "admin-id",
        email: "admin@test.com",
        name: "Admin",
        workspaceId: "test-ws-id",
        role: "admin",
        permissions: ["*"],
    });
    await next();
});

describe("Archive", () => {
    it("GET /api/archive returns 401 without auth", async () => {
        const app = new Hono();
        app.use("/api/*", rejectAll);
        app.route("/api", archiveRoute);
        const res = await app.request("/api/archive");
        expect(res.status).toBe(401);
    });

    it("GET /api/archive returns 200", async () => {
        const app = new Hono();
        app.use("/api/*", mockWorkspace);
        app.route("/api", archiveRoute);
        const res = await app.request("/api/archive");
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
    });
});
