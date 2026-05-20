import { createMiddleware } from "hono/factory";
import { getAuthUser, AuthUser } from "../lib/get-auth-user.js";
import { PrismaClient } from "@prisma/client";

declare module "hono" {
	interface ContextVariableMap {
		workspaceId: string;
		db: PrismaClient;
		portal: string;
	}
}

export const requireWorkspace = createMiddleware(async (c, next) => {
	let user: AuthUser;
	try {
		user = getAuthUser(c);
	} catch {
		return c.json({ error: "Unauthorized" }, 401);
	}
	const workspaceId = user.workspaceId;
	if (!workspaceId) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	c.set("workspaceId", workspaceId);
	await next();
});

export const requireAdmin = createMiddleware(async (c, next) => {
	let user: AuthUser;
	try {
		user = getAuthUser(c);
	} catch {
		return c.json({ error: "Forbidden: admin role required" }, 403);
	}
	if (user.role !== "admin") {
		return c.json({ error: "Forbidden: admin role required" }, 403);
	}
	await next();
});
