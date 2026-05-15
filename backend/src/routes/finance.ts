import { Hono } from "hono";
import { prisma } from "../lib/db.js";

const route = new Hono();

route.get("/finance/transactions", async (c) => {
  const wid = c.get("workspaceId");
  const items = await prisma.financeTransaction.findMany({
    where: { workspaceId: wid },
    orderBy: { occurredAt: "desc" },
  });
  return c.json(items);
});

route.post("/finance/transactions", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const item = await prisma.financeTransaction.create({
    data: {
      workspaceId: wid,
      title: body.title,
      category: body.category,
      status: body.status || "pending",
      submittedBy: body.submittedBy,
      amount: body.amount || 0,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
    },
  });
  return c.json(item, 201);
});

route.patch("/finance/transactions/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const data: any = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.category !== undefined) data.category = body.category;
  if (body.status !== undefined) data.status = body.status;
  if (body.amount !== undefined) data.amount = body.amount;
  if (body.submittedBy !== undefined) data.submittedBy = body.submittedBy;
  if (body.occurredAt !== undefined)
    data.occurredAt = new Date(body.occurredAt);
  const item = await prisma.financeTransaction.update({
    where: { id, workspaceId: wid },
    data,
  });
  return c.json(item);
});

route.delete("/finance/transactions/:id", async (c) => {
  const wid = c.get("workspaceId");
  await prisma.financeTransaction.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
