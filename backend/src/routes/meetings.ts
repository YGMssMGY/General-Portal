import { Hono } from "hono";
import { z } from "zod";
import { db } from "../lib/db.js";

const route = new Hono();

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  location: z.string().optional(),
  agenda: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  location: z.string().optional(),
  agenda: z.string().optional(),
  minutes: z.string().optional(),
  actionItems: z.string().optional(),
  status: z.string().optional(),
});

route.get("/meetings", async (c) => {
  const wid = c.get("workspaceId");
  const status = c.req.query("status");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const where: any = { workspaceId: wid };
  if (status) where.status = status;
  if (from || to) {
    where.startsAt = {};
    if (from) where.startsAt.gte = new Date(from);
    if (to) where.startsAt.lte = new Date(to);
  }
  const items = await db.meeting.findMany({
    where,
    orderBy: { startsAt: "desc" },
  });
  return c.json(items);
});

route.post("/meetings", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const parsed = createSchema.parse(body);
  const item = await db.meeting.create({
    data: {
      workspaceId: wid,
      title: parsed.title,
      description: parsed.description,
      startsAt: new Date(parsed.startsAt),
      endsAt: parsed.endsAt ? new Date(parsed.endsAt) : null,
      location: parsed.location,
      agenda: parsed.agenda,
    },
  });
  return c.json(item, 201);
});

route.patch("/meetings/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const existing = await db.meeting.findFirst({
    where: { id, workspaceId: wid },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const body = await c.req.json();
  const parsed = updateSchema.parse(body);
  const data: any = { ...parsed };
  if (parsed.startsAt) data.startsAt = new Date(parsed.startsAt);
  if (parsed.endsAt) data.endsAt = new Date(parsed.endsAt);
  const item = await db.meeting.update({ where: { id }, data });
  return c.json(item);
});

route.delete("/meetings/:id", async (c) => {
  const wid = c.get("workspaceId");
  const existing = await db.meeting.findFirst({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await db.meeting.delete({ where: { id: existing.id } });
  return c.body(null, 204);
});

route.post("/meetings/:id/rsvp", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const existing = await db.meeting.findFirst({
    where: { id, workspaceId: wid },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const auth = await import("@hono/auth-js").then((m) => m.getAuthUser(c));
  const userId = (auth?.token as any)?.id as string;
  const userName = ((auth?.token as any)?.name as string) || "Unknown";
  const body = await c.req.json();
  const response = z.enum(["yes", "no", "maybe"]).parse(body.response);
  const rsvp = await db.meetingRsvp.upsert({
    where: { meetingId_userId: { meetingId: id, userId } },
    update: { response, userName },
    create: { meetingId: id, userId, userName, response },
  });
  return c.json(rsvp, 201);
});

route.get("/meetings/:id/rsvps", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const existing = await db.meeting.findFirst({
    where: { id, workspaceId: wid },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  const rsvps = await db.meetingRsvp.findMany({ where: { meetingId: id } });
  return c.json(rsvps);
});

export default route;
