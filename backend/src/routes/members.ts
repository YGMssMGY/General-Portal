import { Hono } from "hono";
import { db } from "../lib/db.js";

const route = new Hono();

route.get("/members", async (c) => {
  const wid = c.get("workspaceId");
  const memberships = await db.membership.findMany({
    where: { workspaceId: wid },
    include: {
      user: true,
      permissions: { select: { permission: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return c.json(
    memberships.map((m) => ({
      id: m.id,
      userId: m.user.id,
      email: m.user.email,
      displayName: m.user.displayName,
      avatarUrl: m.user.avatarUrl,
      position: m.position,
      accessLabel: m.accessLabel,
      taskCount: m.taskCount,
      volunteerHours: m.volunteerHours,
      permissions: m.permissions.map((p) => p.permission),
    })),
  );
});

route.patch("/members/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const data: any = {};
  if (body.position !== undefined) data.position = body.position;
  if (body.accessLabel !== undefined) data.accessLabel = body.accessLabel;
  if (body.taskCount !== undefined) data.taskCount = body.taskCount;
  if (body.volunteerHours !== undefined)
    data.volunteerHours = body.volunteerHours;
  const item = await db.membership.update({
    where: { id, workspaceId: wid },
    data,
    include: { user: true, permissions: { select: { permission: true } } },
  });
  return c.json(item);
});

route.delete("/members/:id", async (c) => {
  const wid = c.get("workspaceId");
  await db.membership.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
