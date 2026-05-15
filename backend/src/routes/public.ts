import { Hono } from "hono";
import { db } from "../lib/db.js";

const route = new Hono();

route.get("/events/public", async (c) => {
  const items = await db.publicEvent.findMany({
    orderBy: { eventDate: "desc" },
  });
  return c.json({ content: items });
});

route.get("/photos", async (c) => {
  const items = await db.photo.findMany({
    orderBy: { photoDate: "desc" },
  });
  return c.json({ content: items });
});

route.get("/workspace", async (c) => {
  const workspace = await db.workspace.findFirst();
  if (!workspace) return c.json({ error: "No workspace found" }, 404);
  return c.json({
    id: workspace.id,
    name: workspace.name,
    description: workspace.description,
  });
});

export default route;
