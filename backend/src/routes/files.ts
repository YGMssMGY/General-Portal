import { Hono } from "hono";
import { prisma } from "../lib/db.js";

const route = new Hono();

route.get("/files", async (c) => {
  const wid = c.get("workspaceId");
  const items = await prisma.workspaceFile.findMany({
    where: { workspaceId: wid },
    orderBy: { createdAt: "desc" },
  });
  return c.json(items);
});

route.delete("/files/:id", async (c) => {
  const wid = c.get("workspaceId");
  await prisma.workspaceFile.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
