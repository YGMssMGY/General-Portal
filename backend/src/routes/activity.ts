import { Hono } from "hono";
import { db } from "../lib/db.js";

const route = new Hono();

route.get("/activity", async (c) => {
  const wid = c.get("workspaceId");
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const before = c.req.query("before");
  const where: any = { workspaceId: wid };
  if (before) where.occurredAt = { lt: new Date(before) };
  const items = await db.activityLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: Math.min(limit, 100),
  });
  return c.json(items);
});

export default route;
