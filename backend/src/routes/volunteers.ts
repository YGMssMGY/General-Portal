import { Hono } from "hono";
import { z } from "zod";

const route = new Hono();

const signupSchema = z.object({
  memberName: z.string().min(1),
  status: z.string().optional(),
  hoursLogged: z.number().optional(),
});

const signupUpdateSchema = z.object({
  status: z.string().optional(),
  hoursLogged: z.number().optional(),
});

// ── Slot CRUD ──

route.get("/volunteers/slots", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const items = await db.volunteerSlot.findMany({
    where: { workspaceId: wid },
    orderBy: { startsAt: "asc" },
  });
  return c.json(items);
});

route.post("/volunteers/slots", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const item = await db.volunteerSlot.create({
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
  const db = c.get("db");
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
  const item = await db.volunteerSlot.update({
    where: { id, workspaceId: wid },
    data,
  });
  return c.json(item);
});

route.delete("/volunteers/slots/:id", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  await db.volunteerSlot.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

// ── Signups ──

route.get("/volunteers/slots/:slotId/signups", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const { slotId } = c.req.param();
  const items = await db.volunteerSignup.findMany({
    where: { slot: { id: slotId, workspaceId: wid } },
    orderBy: { createdAt: "asc" },
  });
  return c.json(items);
});

route.post("/volunteers/slots/:slotId/signups", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const { slotId } = c.req.param();
  const body = await c.req.json();
  const parsed = signupSchema.parse(body);
  await db.volunteerSlot.findFirstOrThrow({
    where: { id: slotId, workspaceId: wid },
  });
  const item = await db.volunteerSignup.create({
    data: {
      slotId,
      memberName: parsed.memberName,
      status: parsed.status || "registered",
      hoursLogged: parsed.hoursLogged || 0,
    },
  });
  // Increment filled count on slot
  await db.volunteerSlot.update({
    where: { id: slotId },
    data: { filled: { increment: 1 } },
  });
  return c.json(item, 201);
});

route.patch("/volunteers/signups/:id", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = signupUpdateSchema.parse(body);
  const existing = await db.volunteerSignup.findFirst({
    where: { id, slot: { workspaceId: wid } },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const item = await db.volunteerSignup.update({
    where: { id },
    data: parsed,
  });
  return c.json(item);
});

// ── Stats ──

route.get("/volunteers/stats", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const [hoursAgg, activeCount, topSignups] = await Promise.all([
    db.volunteerSignup.aggregate({
      where: { slot: { workspaceId: wid } },
      _sum: { hoursLogged: true },
    }),
    db.volunteerSignup.count({
      where: { slot: { workspaceId: wid }, status: "registered" },
    }),
    db.volunteerSignup.findMany({
      where: { slot: { workspaceId: wid } },
      orderBy: { hoursLogged: "desc" },
      take: 1,
    }),
  ]);

  return c.json({
    totalHours: hoursAgg._sum.hoursLogged || 0,
    activeVolunteers: activeCount,
    topContributor:
      topSignups.length > 0
        ? {
            memberName: topSignups[0].memberName,
            hoursLogged: topSignups[0].hoursLogged,
          }
        : null,
  });
});

export default route;
