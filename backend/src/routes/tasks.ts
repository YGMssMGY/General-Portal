import { Hono } from "hono";
import { z } from "zod";

const route = new Hono();

const createSchema = z.object({
    title: z.string().min(1),
    status: z.string().optional(),
    priority: z.string().optional(),
    project: z.string().optional(),
    dueDate: z.string().optional(),
    assigneeName: z.string().optional(),
    assigneeId: z.string().optional(),
    progress: z.number().optional(),
    blockedReason: z.string().optional(),
    position: z.number().optional(),
});

const updateSchema = createSchema.partial();

const subtaskSchema = z.object({
    title: z.string().min(1),
    completed: z.boolean().optional(),
    position: z.number().optional(),
});

const subtaskUpdateSchema = z.object({
    title: z.string().optional(),
    completed: z.boolean().optional(),
    position: z.number().optional(),
});

const commentSchema = z.object({
    authorName: z.string().min(1),
    body: z.string().min(1),
});

const attachmentSchema = z.object({
    name: z.string().min(1),
    fileType: z.string().optional(),
    sizeLabel: z.string().optional(),
    storageKey: z.string().optional(),
});

// ── Task CRUD ──

route.get("/tasks", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const status = c.req.query("status");
    const where: any = { workspaceId: wid };
    if (status) where.status = status;
    const tasks = await db.taskItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
    });
    return c.json(tasks);
});

route.post("/tasks", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const body = await c.req.json();
    const parsed = createSchema.parse(body);
    let assigneeName = parsed.assigneeName;
    if (parsed.assigneeId && !assigneeName) {
        const user = await db.user.findUnique({
            where: { id: parsed.assigneeId },
            select: { name: true },
        });
        if (user) assigneeName = user.name;
    }
    const task = await db.taskItem.create({
        data: {
            workspaceId: wid,
            title: parsed.title,
            status: (parsed.status || "todo") as any,
            priority: (parsed.priority || "medium") as any,
            project: parsed.project,
            dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
            assigneeName,
            assigneeId: parsed.assigneeId || null,
            progress: parsed.progress || 0,
            blockedReason: parsed.blockedReason,
            position: parsed.position ?? 0,
        },
    });
    return c.json(task, 201);
});

route.patch("/tasks/:id", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = updateSchema.parse(body);
    const data: any = { ...parsed };
    if (parsed.dueDate) data.dueDate = new Date(parsed.dueDate);
    const task = await db.taskItem.update({
        where: { id, workspaceId: wid },
        data,
    });
    return c.json(task);
});

route.delete("/tasks/:id", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    await db.taskItem.delete({
        where: { id: c.req.param("id"), workspaceId: wid },
    });
    return c.body(null, 204);
});

// ── Subtasks ──

route.get("/tasks/:taskId/subtasks", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const { taskId } = c.req.param();
    const items = await db.taskSubtask.findMany({
        where: { task: { id: taskId, workspaceId: wid } },
        orderBy: { position: "asc" },
    });
    return c.json(items);
});

route.post("/tasks/:taskId/subtasks", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const { taskId } = c.req.param();
    const body = await c.req.json();
    const parsed = subtaskSchema.parse(body);
    // Verify task exists in workspace
    await db.taskItem.findFirstOrThrow({
        where: { id: taskId, workspaceId: wid },
    });
    const item = await db.taskSubtask.create({
        data: {
            taskId,
            title: parsed.title,
            completed: parsed.completed ?? false,
            position: parsed.position ?? 0,
        },
    });
    return c.json(item, 201);
});

route.patch("/tasks/subtasks/:id", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = subtaskUpdateSchema.parse(body);
    // Verify subtask belongs to workspace through task
    const existing = await db.taskSubtask.findFirst({
        where: { id, task: { workspaceId: wid } },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);
    const item = await db.taskSubtask.update({
        where: { id, task: { workspaceId: wid } },
        data: parsed,
    });
    return c.json(item);
});

route.delete("/tasks/subtasks/:id", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const existing = await db.taskSubtask.findFirst({
        where: { id, task: { workspaceId: wid } },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);
    await db.taskSubtask.delete({ where: { id, task: { workspaceId: wid } } });
    return c.body(null, 204);
});

// ── Comments ──

route.get("/tasks/:taskId/comments", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const { taskId } = c.req.param();
    const items = await db.taskComment.findMany({
        where: { task: { id: taskId, workspaceId: wid } },
        orderBy: { createdAt: "asc" },
    });
    return c.json(items);
});

route.post("/tasks/:taskId/comments", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const { taskId } = c.req.param();
    const body = await c.req.json();
    const parsed = commentSchema.parse(body);
    await db.taskItem.findFirstOrThrow({
        where: { id: taskId, workspaceId: wid },
    });
    const item = await db.taskComment.create({
        data: {
            taskId,
            authorName: parsed.authorName,
            body: parsed.body,
        },
    });
    return c.json(item, 201);
});

// ── Attachments ──

route.post("/tasks/:id/attachments", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = attachmentSchema.parse(body);
    await db.taskItem.findFirstOrThrow({
        where: { id, workspaceId: wid },
    });
    const item = await db.taskAttachment.create({
        data: {
            taskId: id,
            name: parsed.name,
            fileType: parsed.fileType || "Other",
            sizeLabel: parsed.sizeLabel,
            storageKey: parsed.storageKey,
        },
    });
    return c.json(item, 201);
});

route.delete("/tasks/:id/attachments/:attachmentId", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const { id, attachmentId } = c.req.param();
    const existing = await db.taskAttachment.findFirst({
        where: { id: attachmentId, task: { id, workspaceId: wid } },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);
    await db.taskAttachment.delete({
        where: { id: attachmentId, task: { workspaceId: wid } },
    });
    return c.body(null, 204);
});

export default route;
