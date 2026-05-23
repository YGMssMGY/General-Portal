import { createMiddleware } from "hono/factory";
import { getAuthUser as getAuthUserAsync } from "@hono/auth-js";
import { PrismaClient } from "@prisma/client";

declare module "hono" {
    interface ContextVariableMap {
        workspaceId: string;
        db: PrismaClient;
        portal: string;
        user: Record<string, unknown>;
    }
}

export const requireWorkspace = createMiddleware(async (c, next) => {
    const auth = await getAuthUserAsync(c);
    const token = auth?.token as Record<string, unknown> | undefined;
    const workspaceId = token?.workspaceId as string | undefined;
    if (!workspaceId) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    if (!token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("workspaceId", workspaceId);
    c.set("user", token);
    await next();
});

export const requireAdmin = createMiddleware(async (c, next) => {
    const auth = await getAuthUserAsync(c);
    const token = auth?.token as Record<string, unknown> | undefined;
    const role = token?.role as string | undefined;
    if (!role || role !== "admin") {
        return c.json({ error: "Forbidden: admin role required" }, 403);
    }
    if (!token?.id) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    c.set("user", token);
    const workspaceId = token?.workspaceId as string | undefined;
    if (workspaceId) c.set("workspaceId", workspaceId);
    const db = c.get("db");
    const userId = token.id as string;
    if (db && workspaceId) {
        const membership = await db.membership.findFirst({
            where: { userId, workspaceId },
        });
        if (!membership) {
            return c.json({ error: "Forbidden: no membership" }, 403);
        }
    }
    await next();
});
