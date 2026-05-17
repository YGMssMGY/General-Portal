import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAdmin } from "../middleware/auth.js";

const route = new Hono();
route.use("/*", requireAdmin);

const rolePerms: Record<string, string[]> = {
  admin: [
    "task:read",
    "task:write",
    "task:delete",
    "proposal:read",
    "proposal:write",
    "proposal:delete",
    "event:read",
    "event:write",
    "event:delete",
    "volunteer:read",
    "volunteer:write",
    "volunteer:delete",
    "finance:read",
    "finance:write",
    "finance:delete",
    "message:read",
    "message:write",
    "message:delete",
    "file:read",
    "file:write",
    "file:delete",
    "member:read",
    "member:write",
    "member:delete",
    "activity:read",
    "settings:read",
    "settings:write",
  ],
  president: [
    "task:read",
    "task:write",
    "proposal:read",
    "proposal:write",
    "event:read",
    "event:write",
    "volunteer:read",
    "volunteer:write",
    "finance:read",
    "message:read",
    "message:write",
    "file:read",
    "member:read",
    "activity:read",
    "settings:read",
  ],
  officer: [
    "task:read",
    "task:write",
    "proposal:read",
    "proposal:write",
    "event:read",
    "event:write",
    "volunteer:read",
    "message:read",
    "message:write",
    "file:read",
    "member:read",
    "activity:read",
  ],
  member: [
    "task:read",
    "event:read",
    "volunteer:read",
    "message:read",
    "file:read",
    "activity:read",
  ],
};

const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(["admin", "president", "officer", "member"]),
});

route.post("/admin/users", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createUserSchema.parse(body);

    const existing = await db.userAccount.findUnique({
      where: { email: parsed.email },
    });
    if (existing) return c.json({ error: "User already exists" }, 409);

    let workspace = await db.workspace.findFirst();
    if (!workspace) {
      workspace = await db.workspace.create({
        data: { name: "General Portal Workspace", description: "Auto-created" },
      });
    }

    const user = await db.userAccount.create({
      data: { email: parsed.email, displayName: parsed.displayName },
    });

    const label = parsed.role.charAt(0).toUpperCase() + parsed.role.slice(1);
    const membership = await db.membership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        position: label,
        accessLabel: label,
      },
    });

    const perms = rolePerms[parsed.role] || [];
    await Promise.all(
      perms.map((perm) =>
        db.permissionGrant.create({
          data: { membershipId: membership.id, permission: perm },
        }),
      ),
    );

    return c.json(
      {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: parsed.role,
      },
      201,
    );
  } catch (e: any) {
    if (e instanceof z.ZodError)
      return c.json({ error: "Validation error", details: e.errors }, 400);
    console.error("[admin] create user error:", e);
    return c.json({ error: "Failed to create user" }, 500);
  }
});

route.get("/admin/users", async (c) => {
  const users = await db.userAccount.findMany({
    include: {
      memberships: {
        include: { permissions: { select: { permission: true } } },
        where: { workspaceId: (await db.workspace.findFirst())?.id || "" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.memberships[0]?.accessLabel?.toLowerCase() || "none",
      permissionCount: u.memberships[0]?.permissions?.length || 0,
    })),
  );
});

export default route;
