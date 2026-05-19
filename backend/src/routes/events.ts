import { Hono } from "hono";

const route = new Hono();

route.get("/events", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const status = c.req.query("status");
  const dateFrom = c.req.query("dateFrom");
  const where: any = { workspaceId: wid };
  if (status) where.status = status;
  if (dateFrom) where.startsAt = { gte: new Date(dateFrom) };
  const items = await db.eventItem.findMany({
    where,
    include: { owners: true },
    orderBy: { createdAt: "desc" },
  });
  const mapped = items.map((item: any) => ({
    ...item,
    ownerNames: item.owners.map((o: any) => o.ownerLabel),
  }));
  return c.json(mapped);
});

route.post("/events", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const item = await db.eventItem.create({
    data: {
      workspaceId: wid,
      title: body.title,
      status: body.status || "pending",
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      progress: body.progress || 0,
      budgetUsed: body.budgetUsed || 0,
      budgetTotal: body.budgetTotal || 0,
      owners:
        body.owners || body.ownerNames
          ? {
              create: (body.owners || body.ownerNames).map((o: string) => ({
                ownerLabel: o,
              })),
            }
          : undefined,
    },
    include: { owners: true },
  });
  return c.json(item, 201);
});

route.patch("/events/:id", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const { owners: _, ...fields } = body;
  const data: any = { ...fields };
  if (fields.startsAt) data.startsAt = new Date(fields.startsAt);
  if (fields.endsAt) data.endsAt = new Date(fields.endsAt);

  // Handle owner updates: delete existing and recreate
  const ownerLabels = body.owners || body.ownerNames;
  if (ownerLabels) {
    await db.eventOwner.deleteMany({ where: { eventId: id } });
    await db.eventOwner.createMany({
      data: ownerLabels.map((o: string) => ({ eventId: id, ownerLabel: o })),
    });
  }

  const item = await db.eventItem.update({
    where: { id, workspaceId: wid },
    data,
    include: { owners: true },
  });
  return c.json({
    ...item,
    ownerNames: (item as any).owners.map((o: any) => o.ownerLabel),
  });
});

route.delete("/events/:id", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  await db.eventItem.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
