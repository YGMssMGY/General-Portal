import { Hono } from "hono";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";

const route = new Hono();

route.get("/events/public", async (c) => {
    const db = c.get("db");
    const items = await db.publicEvent.findMany({
        orderBy: { eventDate: "desc" },
    });
    return c.json({ content: items });
});

route.get("/photos", async (c) => {
    const db = c.get("db");
    const items = await db.photo.findMany({
        orderBy: { photoDate: "desc" },
    });
    return c.json({ content: items });
});

route.get("/workspace", async (c) => {
    const db = c.get("db");
    const workspace = await db.workspace.findFirst();
    if (!workspace) return c.json({ error: "No workspace found" }, 404);
    return c.json({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
    });
});

// --- Admin CRUD for Public Events ---

const createEventSchema = z.object({
    title: z.string().min(1),
    eventDate: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
});

const updateEventSchema = z.object({
    title: z.string().min(1).optional(),
    eventDate: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
});

route.post("/events/public", requireAdmin, async (c) => {
    try {
        const db = c.get("db");
        const workspaceId = c.get("workspaceId");
        const body = await c.req.json();
        const parsed = createEventSchema.parse(body);

        const data: any = { title: parsed.title, workspaceId };
        if (parsed.eventDate !== undefined) data.eventDate = new Date(parsed.eventDate);
        if (parsed.description !== undefined) data.description = parsed.description;
        if (parsed.category !== undefined) data.category = parsed.category;

        const event = await db.publicEvent.create({ data });
        return c.json({ content: event }, 201);
    } catch (e: unknown) {
        if (e instanceof z.ZodError)
            return c.json({ error: "Validation error", details: e.errors }, 400);
        console.error("[public] create event error:", e);
        return c.json({ error: "Failed to create event" }, 500);
    }
});

route.patch("/events/public/:id", requireAdmin, async (c) => {
    try {
        const db = c.get("db");
        const workspaceId = c.get("workspaceId");
        const id = c.req.param("id");
        const body = await c.req.json();
        const parsed = updateEventSchema.parse(body);

        const existing = await db.publicEvent.findUnique({ where: { id } });
        if (!existing) return c.json({ error: "Event not found" }, 404);
        if (existing.workspaceId !== workspaceId) return c.json({ error: "Forbidden" }, 403);

        const data: any = {};
        if (parsed.title !== undefined) data.title = parsed.title;
        if (parsed.eventDate !== undefined) data.eventDate = new Date(parsed.eventDate);
        if (parsed.description !== undefined) data.description = parsed.description;
        if (parsed.category !== undefined) data.category = parsed.category;

        const event = await db.publicEvent.update({ where: { id }, data });
        return c.json({ content: event });
    } catch (e: unknown) {
        if (e instanceof z.ZodError)
            return c.json({ error: "Validation error", details: e.errors }, 400);
        console.error("[public] update event error:", e);
        return c.json({ error: "Failed to update event" }, 500);
    }
});

route.delete("/events/public/:id", requireAdmin, async (c) => {
    try {
        const db = c.get("db");
        const workspaceId = c.get("workspaceId");
        const id = c.req.param("id");

        const existing = await db.publicEvent.findUnique({ where: { id } });
        if (!existing) return c.json({ error: "Event not found" }, 404);
        if (existing.workspaceId !== workspaceId) return c.json({ error: "Forbidden" }, 403);

        await db.publicEvent.delete({ where: { id } });
        return c.json({ success: true }, 200);
    } catch (e: unknown) {
        console.error("[public] delete event error:", e);
        return c.json({ error: "Failed to delete event" }, 500);
    }
});

// --- Admin CRUD for Photos ---

const createPhotoSchema = z.object({
    title: z.string().min(1),
    photoDate: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
});

const updatePhotoSchema = z.object({
    title: z.string().min(1).optional(),
    photoDate: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
});

route.post("/photos", requireAdmin, async (c) => {
    try {
        const db = c.get("db");
        const workspaceId = c.get("workspaceId");
        const body = await c.req.json();
        const parsed = createPhotoSchema.parse(body);

        const data: any = { title: parsed.title, workspaceId };
        if (parsed.photoDate !== undefined) data.photoDate = new Date(parsed.photoDate);
        if (parsed.description !== undefined) data.description = parsed.description;
        if (parsed.imageUrl !== undefined) data.imageUrl = parsed.imageUrl;

        const photo = await db.photo.create({ data });
        return c.json({ content: photo }, 201);
    } catch (e: unknown) {
        if (e instanceof z.ZodError)
            return c.json({ error: "Validation error", details: e.errors }, 400);
        console.error("[public] create photo error:", e);
        return c.json({ error: "Failed to create photo" }, 500);
    }
});

route.patch("/photos/:id", requireAdmin, async (c) => {
    try {
        const db = c.get("db");
        const workspaceId = c.get("workspaceId");
        const id = c.req.param("id");
        const body = await c.req.json();
        const parsed = updatePhotoSchema.parse(body);

        const existing = await db.photo.findUnique({ where: { id } });
        if (!existing) return c.json({ error: "Photo not found" }, 404);
        if (existing.workspaceId !== workspaceId) return c.json({ error: "Forbidden" }, 403);

        const data: any = {};
        if (parsed.title !== undefined) data.title = parsed.title;
        if (parsed.photoDate !== undefined) data.photoDate = new Date(parsed.photoDate);
        if (parsed.description !== undefined) data.description = parsed.description;
        if (parsed.imageUrl !== undefined) data.imageUrl = parsed.imageUrl;

        const photo = await db.photo.update({ where: { id }, data });
        return c.json({ content: photo });
    } catch (e: unknown) {
        if (e instanceof z.ZodError)
            return c.json({ error: "Validation error", details: e.errors }, 400);
        console.error("[public] update photo error:", e);
        return c.json({ error: "Failed to update photo" }, 500);
    }
});

route.delete("/photos/:id", requireAdmin, async (c) => {
    try {
        const db = c.get("db");
        const workspaceId = c.get("workspaceId");
        const id = c.req.param("id");

        const existing = await db.photo.findUnique({ where: { id } });
        if (!existing) return c.json({ error: "Photo not found" }, 404);
        if (existing.workspaceId !== workspaceId) return c.json({ error: "Forbidden" }, 403);

        await db.photo.delete({ where: { id } });
        return c.json({ success: true }, 200);
    } catch (e: unknown) {
        console.error("[public] delete photo error:", e);
        return c.json({ error: "Failed to delete photo" }, 500);
    }
});

export default route;
