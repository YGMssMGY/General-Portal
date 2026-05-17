import { createMiddleware } from "hono/factory";
import { getAuthUser } from "@hono/auth-js";

declare module "hono" {
  interface ContextVariableMap {
    workspaceId: string;
  }
}

export const requireWorkspace = createMiddleware(async (c, next) => {
  const auth = await getAuthUser(c);
  const workspaceId = (auth?.token as any)?.workspaceId as string | undefined;
  if (!workspaceId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("workspaceId", workspaceId);
  await next();
});

export const requireAdmin = createMiddleware(async (c, next) => {
  const auth = await getAuthUser(c);
  const role = (auth?.token as any)?.role as string | undefined;
  if (!role || role !== "admin") {
    return c.json({ error: "Forbidden: admin role required" }, 403);
  }
  await next();
});
