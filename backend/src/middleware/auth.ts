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
