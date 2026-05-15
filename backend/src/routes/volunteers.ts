import { Hono } from "hono";
import { prisma } from "../lib/db.js";

const route = new Hono();

route.get("/volunteers/slots", async (c) => {
  const wid = c.get("workspaceId");
  const items = await prisma.volunteerSlot.findMany({
    where: { workspaceId: wid },
    orderBy: { startsAt: "asc" },
  });
  return c.json(items);
});

route.post("/volunteers/slots", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const item = await prisma.volunteerSlot.create({
    data: {
      workspaceId: wid,
      title: body.title,
      eventName: body.eventName,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      capacity: body.capacity || 0,
      filled: body.filled || 0,
      hours: body.hours || 0,
    },
  });
  return c.json(item, 201);
});

route.patch("/volunteers/slots/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const data: any = {};
  if (body.capacity !== undefined) data.capacity = body.capacity;
  if (body.filled !== undefined) data.filled = body.filled;
  if (body.hours !== undefined) data.hours = body.hours;
  if (body.title !== undefined) data.title = body.title;
  if (body.eventName !== undefined) data.eventName = body.eventName;
  if (body.startsAt !== undefined) data.startsAt = new Date(body.startsAt);
  const item = await prisma.volunteerSlot.update({
    where: { id, workspaceId: wid },
    data,
  });
  return c.json(item);
});

route.delete("/volunteers/slots/:id", async (c) => {
  const wid = c.get("workspaceId");
  await prisma.volunteerSlot.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
