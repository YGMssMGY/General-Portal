import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { resourceRoute } from "../../../src/lib/route-factory.js";
import { z } from "zod";

const createSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    status: z.string().default("todo"),
});

const updateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.string().optional(),
});

interface MockDelegate {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
}

function mockDelegate(overrides?: Partial<MockDelegate>): MockDelegate {
    return {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: "new-1", title: "created" }),
        update: vi.fn().mockResolvedValue({ id: "1", title: "updated" }),
        delete: vi.fn().mockResolvedValue({ id: "1" }),
        ...overrides,
    };
}

function createTestApp(route: Hono, _delegate: MockDelegate) {
    const app = new Hono();
    app.use("*", (c, next) => {
        c.set("user", {
            id: "user-1",
            email: "test@test.com",
            name: "Test User",
            workspaceId: "ws-1",
            role: "admin",
            permissions: ["*"],
        });
        c.set("workspaceId", "ws-1");
        c.set("portal", "developers");
        c.set("db", {
            User: { findUnique: vi.fn() },
        });
        return next();
    });
    app.route("/", route);
    return app;
}

describe("resourceRoute", () => {
    let delegate: MockDelegate;
    let route: Hono;
    let app: Hono;

    beforeEach(() => {
        delegate = mockDelegate();
        route = resourceRoute({
            delegate: delegate as any,
            createSchema,
            updateSchema,
            resourceName: "tasks",
        });
        app = createTestApp(route, delegate);
    });

    it("returns a Hono route handler", () => {
        expect(route).toBeDefined();
        expect(typeof route.fetch).toBe("function");
    });

    it("GET / returns paginated empty list", async () => {
        const res = await app.request("/");
        expect(res.status).toBe(200);
        const body = JSON.parse(await res.text());
        expect(body.success).toBe(true);
        expect(body.data).toEqual([]);
        expect(body.meta.total).toBe(0);
    });

    it("GET / returns items when they exist", async () => {
        const items = [{ id: "1", title: "Test", workspaceId: "ws-1" }];
        delegate.findMany.mockResolvedValue(items);
        delegate.count.mockResolvedValue(1);

        const res = await app.request("/");
        const body = JSON.parse(await res.text());
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].title).toBe("Test");
    });

    it("GET /:id returns 404 for missing item", async () => {
        const res = await app.request("/item-1");
        expect(res.status).toBe(404);
    });

    it("GET /:id returns item when found", async () => {
        delegate.findFirst.mockResolvedValue({
            id: "item-1",
            title: "Found",
            workspaceId: "ws-1",
        });

        const res = await app.request("/item-1");
        const body = JSON.parse(await res.text());
        expect(body.success).toBe(true);
        expect(body.data.id).toBe("item-1");
    });

    it("POST / creates an item and returns 201", async () => {
        delegate.create.mockResolvedValue({
            id: "new-1",
            title: "New Task",
            workspaceId: "ws-1",
        });

        const res = await app.request("/", {
            method: "POST",
            body: JSON.stringify({ title: "New Task" }),
            headers: { "Content-Type": "application/json" },
        });
        expect(res.status).toBe(201);
    });

    it("POST / returns 400 for invalid input", async () => {
        const res = await app.request("/", {
            method: "POST",
            body: JSON.stringify({ title: "" }),
            headers: { "Content-Type": "application/json" },
        });
        expect(res.status).toBe(400);
        const body = JSON.parse(await res.text());
        expect(body.success).toBe(false);
        expect(body.error.code).toBe("VALIDATION");
    });

    it("PATCH /:id updates an item", async () => {
        delegate.findFirst.mockResolvedValue({
            id: "item-1",
            title: "Old",
            workspaceId: "ws-1",
        });
        delegate.update.mockResolvedValue({
            id: "item-1",
            title: "Updated",
        });

        const res = await app.request("/item-1", {
            method: "PATCH",
            body: JSON.stringify({ title: "Updated" }),
            headers: { "Content-Type": "application/json" },
        });
        expect(res.status).toBe(200);
        const body = JSON.parse(await res.text());
        expect(body.data.title).toBe("Updated");
    });

    it("PATCH /:id returns 404 for missing item", async () => {
        const res = await app.request("/missing", {
            method: "PATCH",
            body: JSON.stringify({ title: "Updated" }),
            headers: { "Content-Type": "application/json" },
        });
        expect(res.status).toBe(404);
    });

    it("DELETE /:id returns 204", async () => {
        delegate.findFirst.mockResolvedValue({
            id: "item-1",
            title: "Delete me",
            workspaceId: "ws-1",
        });

        const res = await app.request("/item-1", { method: "DELETE" });
        expect(res.status).toBe(204);
    });

    it("DELETE /:id returns 404 for missing item", async () => {
        const res = await app.request("/missing", { method: "DELETE" });
        expect(res.status).toBe(404);
    });

    it("GET / with status filter passes filter to delegate", async () => {
        delegate.findMany.mockResolvedValue([]);
        delegate.count.mockResolvedValue(0);

        await app.request("/?status=todo");

        expect(delegate.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: "todo" }),
            }),
        );
    });
});
