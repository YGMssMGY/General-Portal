import { Hono } from "hono";
import { getAuthUser } from "../lib/get-auth-user.js";

const route = new Hono();

route.get("/me", async (c) => {
    const user = getAuthUser(c);
    const wid = c.get("workspaceId");

    const db = c.get("db");
    const membership = await db.membership.findFirst({
        where: { userId: user.id, ...(wid ? { workspaceId: wid } : {}) },
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
        name: membership.user.name,
        image: membership.user.image,
        role: membership.accessLabel.toLowerCase(),
        workspaceName: membership.workspace.name,
        workspaceDescription: membership.workspace.description,
        permissions: membership.permissions.map((p) => p.permission),
    });
});

export default route;
