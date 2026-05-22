import { Hono } from "hono";

const route = new Hono();

route.get("/messages/threads", async (c) => {
    const wid = c.get("workspaceId");
    const db = c.get("db");
    const items = await db.messageThread.findMany({
        where: { workspaceId: wid },
        include: {
            participants: true,
            messages: {
                orderBy: { sentAt: "asc" },
                select: {
                    id: true,
                    authorName: true,
                    sentAt: true,
                    threadId: true,
                    createdAt: true,
                    updatedAt: true,
                    attachments: true,
                    body: true,
                },
            },
        },
        orderBy: { lastMessageAt: "desc" },
    });
    return c.json(items);
});

route.post("/messages/threads", async (c) => {
    const wid = c.get("workspaceId");
    const body = await c.req.json();
    const db = c.get("db");
    const userName = c.get("user")?.name as string | undefined;
    try {
        const item = await db.messageThread.create({
            data: {
                workspaceId: wid,
                title: body.title || "Untitled",
                context: body.context || "general",
                preview: body.body?.slice(0, 100) || "",
                lastMessageAt: new Date(),
                participants: Array.isArray(body.participants)
                    ? { create: body.participants.map((n: string) => ({ name: n })) }
                    : undefined,
                messages: body.body
                    ? {
                          create: {
                              authorName: userName || "System",
                              body: body.body,
                              sentAt: new Date(),
                          },
                      }
                    : undefined,
            },
            include: {
                participants: true,
                messages: { include: { attachments: true } },
            },
        });
        return c.json(item, 201);
    } catch (e: any) {
        console.error("[messages] create error:", e);
        return c.json({ error: e?.message || "Create failed" }, 500);
    }
});

route.post("/messages/threads/:id/reply", async (c) => {
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const body = await c.req.json();
    const db = c.get("db");
    const userName = (c.get("user") as any)?.name as string | undefined;
    if (!body?.body) return c.json({ error: "Body is required" }, 400);
    try {
        const thread = await db.messageThread.findUnique({
            where: { id, workspaceId: wid },
        });
        if (!thread) return c.json({ error: "Thread not found" }, 404);
        const msg = await db.message.create({
            data: {
                threadId: id,
                authorName: userName || "Unknown",
                body: body.body,
                sentAt: new Date(),
            },
            include: { attachments: true },
        });
        await db.messageThread.update({
            where: { id },
            data: { preview: body.body.slice(0, 100), lastMessageAt: new Date() },
        });
        return c.json(msg, 201);
    } catch (e: any) {
        console.error("[messages] reply error:", e);
        return c.json({ error: "Reply failed" }, 500);
    }
});

route.patch("/messages/threads/:id/read", async (c) => {
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const db = c.get("db");
    const thread = await db.messageThread.findUnique({
        where: { id, workspaceId: wid },
    });
    if (!thread) return c.json({ error: "Thread not found" }, 404);
    await db.messageThread.update({ where: { id }, data: { unreadCount: 0 } });
    return c.body(null, 204);
});

route.delete("/messages/threads/:id", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const thread = await db.messageThread.findUnique({
        where: { id, workspaceId: wid },
    });
    if (!thread) return c.json({ error: "Thread not found" }, 404);
    await db.messageThread.update({
        where: { id },
        data: { status: "archived" },
    });
    return c.body(null, 204);
});

export default route;
