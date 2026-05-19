import { Hono } from "hono";
import { z } from "zod";

const route = new Hono();

const createSchema = z.object({
  title: z.string().min(1),
  amount: z.number(),
  proposalId: z.string().optional(),
  notes: z.string().optional(),
});

route.get("/budget", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const items = await db.budgetAllocation.findMany({
    where: { workspaceId: wid },
    orderBy: { createdAt: "desc" },
  });
  return c.json(items);
});

route.get("/budget/:id", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const item = await db.budgetAllocation.findFirst({
    where: { id: c.req.param("id"), workspaceId: wid },
    include: { financeTransactions: true },
  });
  if (!item) return c.json({ error: "Not found" }, 404);
  return c.json(item);
});

route.post("/budget", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const parsed = createSchema.parse(body);
  const item = await db.budgetAllocation.create({
    data: {
      workspaceId: wid,
      title: parsed.title,
      amount: parsed.amount,
      proposalId: parsed.proposalId,
      notes: parsed.notes,
    },
  });
  return c.json(item, 201);
});

route.patch("/budget/:id/approve", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const item = await db.budgetAllocation.findFirst({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  if (!item) return c.json({ error: "Not found" }, 404);
  const auth = await import("@hono/auth-js").then((m) => m.getAuthUser(c));
  const userName = ((auth?.token as any)?.name as string) || "Unknown";
  const updated = await db.budgetAllocation.update({
    where: { id: item.id },
    data: { status: "approved", approvedBy: userName, approvedAt: new Date() },
  });
  return c.json(updated);
});

route.patch("/budget/:id/spend", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const item = await db.budgetAllocation.findFirst({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  if (!item) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json();
  const amount = z.number().parse(body.amount);
  const transaction = await db.financeTransaction.create({
    data: {
      workspaceId: wid,
      title: `Spend: ${item.title}`,
      category: "Other",
      submittedBy: "System",
      amount,
      type: "expense",
      occurredAt: new Date(),
      budgetId: item.id,
    },
  });
  return c.json(transaction, 201);
});

route.patch("/budget/:id/reconcile", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const item = await db.budgetAllocation.findFirst({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  if (!item) return c.json({ error: "Not found" }, 404);
  const updated = await db.budgetAllocation.update({
    where: { id: item.id },
    data: { status: "reconciled", reconciledAt: new Date() },
  });
  return c.json(updated);
});

export default route;
