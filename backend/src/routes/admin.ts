import { Hono } from "hono";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";
import { getPermissionsForRole } from "../lib/permissions.js";

const route = new Hono();
route.use("/*", requireAdmin);

const createUserSchema = z.object({
    email: z.string().min(1),
    name: z.string().min(1),
    password: z.string().min(1),
    role: z.enum(["admin", "president", "officer", "member"]),
});

route.post("/admin/users", async (c) => {
    try {
        const db = c.get("db");
        const portal = c.get("portal") || "developers";
        const body = await c.req.json();
        const parsed = createUserSchema.parse(body);

        const existing = await db.user.findUnique({
            where: { email: parsed.email },
        });
        if (existing) return c.json({ error: "User already exists" }, 409);

        const wsName = portal === "developers" ? "Developers Club" : "Student Council";
        let workspace = await db.workspace.findFirst({ where: { name: wsName } });
        if (!workspace) {
            workspace = await db.workspace.create({
                data: { name: wsName, description: "Auto-created" },
            });
        }

        const user = await db.user.create({
            data: {
                email: parsed.email,
                name: parsed.name,
                password: parsed.password,
            },
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

        const perms = getPermissionsForRole(parsed.role);
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
                name: user.name,
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
    const db = c.get("db");
    const portal = c.get("portal") || "developers";
    const wsName = portal === "developers" ? "Developers Club" : "Student Council";
    const workspace = await db.workspace.findFirst({ where: { name: wsName } });
    const users = await db.user.findMany({
        include: {
            memberships: {
                include: { permissions: { select: { permission: true } } },
                where: workspace ? { workspaceId: workspace.id } : undefined,
            },
        },
        orderBy: { createdAt: "desc" },
    });

    return c.json(
        users.map((u) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.memberships[0]?.accessLabel?.toLowerCase() || "none",
            permissionCount: u.memberships[0]?.permissions?.length || 0,
        })),
    );
});

const whitelistSchema = z.object({
    email: z.string().email(),
    role: z.enum(["admin", "president", "officer", "member"]).optional().default("admin"),
});

route.get("/admin/whitelist", async (c) => {
    try {
        const db = c.get("db");
        const portal = c.get("portal") || "developers";
        const wsName = portal === "developers" ? "Developers Club" : "Student Council";
        const workspace = await db.workspace.findFirst({ where: { name: wsName } });
        if (!workspace) return c.json([]);

        const users = await db.user.findMany({
            where: {
                memberships: {
                    some: { workspaceId: workspace.id },
                },
            },
            include: {
                memberships: {
                    where: { workspaceId: workspace.id },
                    include: { workspace: { select: { name: true } } },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return c.json(
            users.map((u) => ({
                id: u.id,
                email: u.email,
                name: u.name,
                workspaceName: u.memberships[0]?.workspace?.name || null,
                createdAt: u.createdAt,
            })),
        );
    } catch (e: any) {
        console.error("[admin] whitelist list error:", e);
        return c.json({ error: "Failed to list users" }, 500);
    }
});

route.post("/admin/whitelist", async (c) => {
    try {
        const db = c.get("db");
        const portal = c.get("portal") || "developers";
        const body = await c.req.json();
        const parsed = whitelistSchema.parse(body);

        const existing = await db.user.findUnique({
            where: { email: parsed.email },
        });
        if (existing) return c.json({ error: "User already exists" }, 409);

        const wsName = portal === "developers" ? "Developers Club" : "Student Council";
        let workspace = await db.workspace.findFirst({ where: { name: wsName } });
        if (!workspace) {
            workspace = await db.workspace.create({
                data: { name: wsName, description: "Auto-created" },
            });
        }

        const userName = parsed.email.split("@")[0];
        const user = await db.user.create({
            data: {
                email: parsed.email,
                name: userName,
            },
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

        const perms = getPermissionsForRole(parsed.role);
        await Promise.all(
            perms.map((perm) =>
                db.permissionGrant.create({
                    data: { membershipId: membership.id, permission: perm },
                }),
            ),
        );

        return c.json({ id: user.id, email: user.email, name: user.name, role: parsed.role }, 201);
    } catch (e: any) {
        if (e instanceof z.ZodError)
            return c.json({ error: "Validation error", details: e.errors }, 400);
        console.error("[admin] whitelist create error:", e);
        return c.json({ error: "Failed to create user" }, 500);
    }
});

route.delete("/admin/whitelist/:id", async (c) => {
    try {
        const db = c.get("db");
        const wid = c.get("workspaceId");
        const id = c.req.param("id");

        if (!wid) return c.json({ error: "Workspace context required" }, 400);

        const membership = await db.membership.findFirst({
            where: { userId: id, workspaceId: wid },
        });
        if (!membership) return c.json({ error: "User not found in workspace" }, 404);

        await db.membership.delete({ where: { id: membership.id } });
        return c.json({ success: true });
    } catch (e: any) {
        console.error("[admin] whitelist delete error:", e);
        return c.json({ error: "Failed to delete user" }, 500);
    }
});

export default route;
