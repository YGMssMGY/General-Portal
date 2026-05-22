import { createMiddleware } from "hono/factory";
import { env } from "../lib/env.js";

export const requireApiKey = createMiddleware(async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
        return c.json({ error: "Unauthorized: missing or invalid API key" }, 401);
    }
    const key = header.slice(7);
    if (key !== env.API_KEY) {
        return c.json({ error: "Unauthorized: invalid API key" }, 401);
    }
    const db = c.get("db");
    const workspace = await db.workspace.findFirst();
    if (workspace) c.set("workspaceId", workspace.id);
    await next();
});
