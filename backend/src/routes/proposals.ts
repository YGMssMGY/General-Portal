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
  dateNeeded: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  summary: z.string().optional(),
  budget: z.number().optional(),
  dateNeeded: z.string().optional(),
});

const attachmentSchema = z.object({
  name: z.string().min(1),
  fileType: z.string().optional(),
  sizeLabel: z.string().optional(),
  storageKey: z.string().optional(),
});

// ── CRUD ──

route.get("/proposals", async (c) => {
  const wid = c.get("workspaceId");
  const status = c.req.query("status");
  const type = c.req.query("type");
  const where: any = { workspaceId: wid };
  if (status) where.status = status;
  if (type) where.type = type;
  const items = await db.proposal.findMany({
    where,
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
      dateNeeded: parsed.dateNeeded ? new Date(parsed.dateNeeded) : null,
    },
  });
  return c.json(item, 201);
});

route.patch("/proposals/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateSchema.parse(body);
  const data: any = { ...parsed };
  if (parsed.dateNeeded) data.dateNeeded = new Date(parsed.dateNeeded);
  const item = await db.proposal.update({
    where: { id, workspaceId: wid },
    data,
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

// ── Attachments ──

route.post("/proposals/:id/attachments", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = attachmentSchema.parse(body);
  await db.proposal.findFirstOrThrow({
    where: { id, workspaceId: wid },
  });
  const item = await db.proposalAttachment.create({
    data: {
      proposalId: id,
      name: parsed.name,
      fileType: parsed.fileType || "Other",
      sizeLabel: parsed.sizeLabel,
      storageKey: parsed.storageKey,
    },
  });
  return c.json(item, 201);
});

route.delete("/proposals/:id/attachments/:attachmentId", async (c) => {
  const wid = c.get("workspaceId");
  const { id, attachmentId } = c.req.param();
  const existing = await db.proposalAttachment.findFirst({
    where: { id: attachmentId, proposal: { id, workspaceId: wid } },
  });
  if (!existing) return c.json({ error: "Not found" }, 404);
  await db.proposalAttachment.delete({ where: { id: attachmentId } });
  return c.body(null, 204);
});

export default route;
