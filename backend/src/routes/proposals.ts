import { Hono } from "hono";
import { db } from "../lib/db.js";
import { z } from "zod";

const route = new Hono();

const createSchema = z.object({
  title: z.string().min(1),
  type: z.string(),
  summary: z.string().optional(),
  budget: z.number().optional(),
  submittedBy: z.string(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  summary: z.string().optional(),
  budget: z.number().optional(),
});

route.get("/proposals", async (c) => {
  const wid = c.get("workspaceId");
  const items = await db.proposal.findMany({
    where: { workspaceId: wid },
    orderBy: { submittedAt: "desc" },
  });
  return c.json(items);
});

route.post("/proposals", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const parsed = createSchema.parse(body);
  const item = await db.proposal.create({
    data: {
      workspaceId: wid,
      title: parsed.title,
      type: parsed.type,
      summary: parsed.summary,
      budget: parsed.budget || 0,
      submittedBy: parsed.submittedBy,
      submittedAt: new Date(),
    },
  });
  return c.json(item, 201);
});

route.patch("/proposals/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateSchema.parse(body);
  const item = await db.proposal.update({
    where: { id, workspaceId: wid },
    data: parsed,
  });
  return c.json(item);
});

route.delete("/proposals/:id", async (c) => {
  const wid = c.get("workspaceId");
  await db.proposal.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
