import { Hono } from "hono";
import { db } from "../lib/db.js";
import { z } from "zod";

const route = new Hono();

const createSchema = z.object({
  title: z.string().min(1),
  status: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  progress: z.number().optional(),
  budgetUsed: z.number().optional(),
  budgetTotal: z.number().optional(),
  owners: z.array(z.string()).optional(),
});

route.get("/events", async (c) => {
  const wid = c.get("workspaceId");
  const items = await db.eventItem.findMany({
    where: { workspaceId: wid },
    include: { owners: true },
    orderBy: { createdAt: "desc" },
  });
  return c.json(items);
});

route.post("/events", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const { owners, ...fields } = body;
  const data: any = { ...fields };
  if (data.startsAt) data.startsAt = new Date(data.startsAt);
  if (data.endsAt) data.endsAt = new Date(data.endsAt);
  const item = await db.eventItem.create({
    data: {
      workspaceId: wid,
      ...data,
      owners: owners
        ? { create: owners.map((o: string) => ({ ownerLabel: o })) }
        : undefined,
    },
    include: { owners: true },
  });
  return c.json(item, 201);
});

route.patch("/events/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { owners, ...fields } = body;
  const data: any = { ...fields };
  if (fields.startsAt) data.startsAt = new Date(fields.startsAt);
  if (fields.endsAt) data.endsAt = new Date(fields.endsAt);
  const item = await db.eventItem.update({
    where: { id, workspaceId: wid },
    data,
    include: { owners: true },
  });
  return c.json(item);
});

route.delete("/events/:id", async (c) => {
  const wid = c.get("workspaceId");
  await db.eventItem.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
