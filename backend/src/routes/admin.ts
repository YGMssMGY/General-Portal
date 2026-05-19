import { Hono } from "hono";
import { z } from "zod";
import { requireAdmin } from "../middleware/auth.js";
import { getPermissionsForRole } from "../lib/permissions.js";

const route = new Hono();
route.use("/*", requireAdmin);

const createUserSchema = z.object({
	email: z.string().min(1),
	displayName: z.string().min(1),
	password: z.string().min(1),
	role: z.enum(["admin", "president", "officer", "member"]),
});

route.post("/admin/users", async (c) => {
	try {
		const db = c.get("db");
		const body = await c.req.json();
		const parsed = createUserSchema.parse(body);

		const existing = await db.user.findUnique({
			where: { email: parsed.email },
		});
		if (existing) return c.json({ error: "User already exists" }, 409);

		let workspace = await db.workspace.findFirst();
		if (!workspace) {
			workspace = await db.workspace.create({
				data: { name: "General Portal Workspace", description: "Auto-created" },
			});
		}

		const user = await db.user.create({
			data: {
				email: parsed.email,
				displayName: parsed.displayName,
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
	const db = c.get("db");
	const users = await db.user.findMany({
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
