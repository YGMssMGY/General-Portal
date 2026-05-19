import { Hono } from "hono";
import { getAuthUser } from "@hono/auth-js";

const route = new Hono();

route.get("/notifications", async (c) => {
  const auth = await getAuthUser(c);
  const userId = (auth?.token as any)?.id as string;
  const workspaceId = c.get("workspaceId");

  const db = c.get("db");
  const notifications = await db.notification.findMany({
    where: { userId, workspaceId, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return c.json(notifications);
});

route.patch("/notifications/read-all", async (c) => {
  const db = c.get("db");
  const auth = await getAuthUser(c);
  const userId = (auth?.token as any)?.id as string;
  const workspaceId = c.get("workspaceId");

  await db.notification.updateMany({
    where: { userId, workspaceId, isRead: false },
    data: { isRead: true },
  });

  return c.json({ success: true });
});

route.patch("/notifications/:id/read", async (c) => {
  const db = c.get("db");
  const auth = await getAuthUser(c);
  const userId = (auth?.token as any)?.id as string;
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");

  const existing = await db.notification.findFirst({
    where: { id, userId, workspaceId },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return c.json({ success: true });
});

export default route;
