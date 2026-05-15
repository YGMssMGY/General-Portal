import { Hono } from "hono";
import { db } from "../lib/db.js";
import { z } from "zod";

const route = new Hono();

const createSchema = z.object({
  title: z.string().min(1),
  status: z.string().optional(),
  priority: z.string().optional(),
  project: z.string().optional(),
  dueDate: z.string().optional(),
  assigneeName: z.string().optional(),
  progress: z.number().optional(),
  blockedReason: z.string().optional(),
});

const updateSchema = createSchema.partial();

route.get("/tasks", async (c) => {
  const wid = c.get("workspaceId");
  const tasks = await db.taskItem.findMany({
    where: { workspaceId: wid },
    orderBy: { createdAt: "desc" },
  });
  return c.json(tasks);
});

route.post("/tasks", async (c) => {
  const wid = c.get("workspaceId");
  const body = await c.req.json();
  const parsed = createSchema.parse(body);
  const task = await db.taskItem.create({
    data: {
      workspaceId: wid,
      title: parsed.title,
      status: parsed.status || "todo",
      priority: parsed.priority || "medium",
      project: parsed.project,
      dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      assigneeName: parsed.assigneeName,
      progress: parsed.progress || 0,
      blockedReason: parsed.blockedReason,
    },
  });
  return c.json(task, 201);
});

route.patch("/tasks/:id", async (c) => {
  const wid = c.get("workspaceId");
  const id = c.req.param("id");
  const body = await c.req.json();
  const parsed = updateSchema.parse(body);
  const data: any = { ...parsed };
  if (parsed.dueDate) data.dueDate = new Date(parsed.dueDate);
  const task = await db.taskItem.update({
    where: { id, workspaceId: wid },
    data,
  });
  return c.json(task);
});

route.delete("/tasks/:id", async (c) => {
  const wid = c.get("workspaceId");
  await db.taskItem.delete({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  return c.body(null, 204);
});

export default route;
