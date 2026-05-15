import { Hono } from "hono";
import { db } from "../lib/db.js";

const route = new Hono();

route.get("/messages/threads", async (c) => {
  const wid = c.get("workspaceId");
  const items = await db.messageThread.findMany({
    where: { workspaceId: wid },
    include: {
      participants: true,
      messages: { orderBy: { sentAt: "asc" } },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  return c.json(items);
});

route.post("/messages/threads", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const item = await db.messageThread.create({
    data: {
      workspaceId: wid,
      title: body.title,
      context: body.context || "general",
      preview: body.body?.slice(0, 100),
      lastMessageAt: new Date(),
      participants: body.participants
        ? { create: body.participants.map((name: string) => ({ name })) }
        : undefined,
      messages: body.body
        ? {
            create: {
              authorName: body.authorName || "System",
              body: body.body,
              sentAt: new Date(),
            },
          }
        : undefined,
    },
    include: { participants: true, messages: true },
  });
  return c.json(item, 201);
});

route.post("/messages/threads/:id/reply", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const msg = await db.message.create({
    data: {
      threadId: id,
      authorName: body.authorName || "Unknown",
      body: body.body,
      sentAt: new Date(),
    },
  });
  await db.messageThread.update({
    where: { id, workspaceId: wid },
    data: { preview: body.body?.slice(0, 100), lastMessageAt: new Date() },
  });
  return c.json(msg, 201);
});

route.delete("/messages/threads/:id", async (c) => {
  const wid = c.get("workspaceId");
  await db.messageThread.update({
    where: { id: c.req.param("id"), workspaceId: wid },
    data: { status: "archived" },
  });
  return c.body(null, 204);
});

export default route;
