import { Hono } from "hono";
import { db } from "../lib/db.js";
import { z } from "zod";

const route = new Hono();

// ── Members ──

route.get("/members", async (c) => {
  const wid = c.get("workspaceId");
  const q = c.req.query("q");
  const limit = Math.min(parseInt(c.req.query("limit") || "100", 10), 200);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  const where: any = { workspaceId: wid };
  if (q) {
    where.OR = [
      { position: { contains: q } },
      { accessLabel: { contains: q } },
      { user: { displayName: { contains: q } } },
      { user: { email: { contains: q } } },
    ];
  }

  const [memberships, total] = await Promise.all([
    db.membership.findMany({
      where,
      include: {
        user: true,
        permissions: { select: { permission: true } },
      },
      orderBy: { createdAt: "asc" },
      skip: offset,
      take: limit,
    }),
    db.membership.count({ where }),
  ]);

  return c.json({
    total,
    members: memberships.map((m) => ({
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
  });
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

// ── Roles (PermissionGrant management) ──

const roleSchema = z.object({
  permission: z.string().min(1),
  membershipId: z.string().min(1),
});

const roleUpdateSchema = z.object({
  permission: z.string().min(1),
});

route.get("/roles", async (c) => {
  const wid = c.get("workspaceId");
  const grants = await db.permissionGrant.findMany({
    where: { membership: { workspaceId: wid } },
    include: {
      membership: {
        select: {
          id: true,
          position: true,
          user: { select: { id: true, displayName: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json(grants);
});

route.post("/roles", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const parsed = roleSchema.parse(body);
  // Verify membership belongs to workspace
  const membership = await db.membership.findFirst({
    where: { id: parsed.membershipId, workspaceId: wid },
  });
  if (!membership) return c.json({ error: "Membership not found" }, 404);
  const grant = await db.permissionGrant.create({
    data: {
      membershipId: parsed.membershipId,
      permission: parsed.permission,
    },
  });
  return c.json(grant, 201);
});

route.patch("/roles/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = roleUpdateSchema.parse(body);
  const existing = await db.permissionGrant.findFirst({
    where: { id, membership: { workspaceId: wid } },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const grant = await db.permissionGrant.update({
    where: { id },
    data: { permission: parsed.permission },
  });
  return c.json(grant);
});

route.delete("/roles/:id", async (c) => {
  const wid = c.get("workspaceId");
  const existing = await db.permissionGrant.findFirst({
    where: { id: c.req.param("id"), membership: { workspaceId: wid } },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await db.permissionGrant.delete({ where: { id: existing.id } });
  return c.body(null, 204);
});

export default route;
