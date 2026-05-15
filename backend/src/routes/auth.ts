import { Hono } from "hono";
import { getAuthUser } from "@hono/auth-js";
import { db } from "../lib/db.js";

const route = new Hono();

route.get("/me", async (c) => {
  const auth = await getAuthUser(c);
  const token = auth?.token as any;
  if (!token?.id) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const membership = await db.membership.findFirst({
    where: { userId: token.id },
    include: {
      workspace: { select: { id: true, name: true, description: true } },
      permissions: { select: { permission: true } },
      user: true,
    },
  });

  if (!membership) {
    return c.json({ error: "No membership found" }, 403);
  }

  return c.json({
    id: membership.user.id,
    email: membership.user.email,
    displayName: membership.user.displayName,
    avatarUrl: membership.user.avatarUrl,
    role: membership.accessLabel.toLowerCase(),
    workspaceName: membership.workspace.name,
    workspaceDescription: membership.workspace.description,
    permissions: membership.permissions.map((p) => p.permission),
  });
});

export default route;
