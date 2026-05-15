import { Hono } from "hono";
import { db } from "../lib/db.js";

const route = new Hono();

route.get("/files", async (c) => {
  const wid = c.get("workspaceId");
  const items = await db.workspaceFile.findMany({
    where: { workspaceId: wid },
    orderBy: { createdAt: "desc" },
  });
  return c.json(items);
});

route.delete("/files/:id", async (c) => {
  const wid = c.get("workspaceId");
  await db.workspaceFile.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
