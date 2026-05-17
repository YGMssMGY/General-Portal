import { Hono } from "hono";
import { db } from "../lib/db.js";
import { createNotification } from "../lib/notifications.js";
import { requireAdmin } from "../middleware/auth.js";

const route = new Hono();
route.use("/*", requireAdmin);

route.post("/archive/end-term", async (c) => {
  const wid = c.get("workspaceId");
  const auth = await import("@hono/auth-js").then((m) => m.getAuthUser(c));
  const actorName = ((auth?.token as any)?.name as string) || "System";

  const currentTerm = await db.termArchive.findFirst({
    where: { workspaceId: wid, isCurrent: true },
  });
  const now = new Date();

  const [tasks, proposals, events] = await Promise.all([
    db.taskItem.findMany({
      where: { workspaceId: wid, status: { not: "done" } },
    }),
    db.proposal.findMany({
      where: { workspaceId: wid, status: { notIn: ["approved", "rejected"] } },
    }),
    db.eventItem.findMany({
      where: {
        workspaceId: wid,
        status: { notIn: ["completed", "cancelled"] },
      },
    }),
  ]);

  const metadata = JSON.stringify({
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status })),
    proposals: proposals.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
    })),
    events: events.map((e) => ({ id: e.id, title: e.title, status: e.status })),
  });

  if (currentTerm) {
    await db.termArchive.update({
      where: { id: currentTerm.id },
      data: { isCurrent: false, endedAt: now, metadata },
    });
  } else {
    await db.termArchive.create({
      data: {
        workspaceId: wid,
        label: `Term ${now.toISOString().slice(0, 7)}`,
        startedAt: new Date(0),
        endedAt: now,
        isCurrent: false,
        metadata,
      },
    });
  }

  await Promise.all([
    db.taskItem.updateMany({
      where: { id: { in: tasks.map((t) => t.id) } },
      data: { status: "archived" },
    }),
    db.proposal.updateMany({
      where: { id: { in: proposals.map((p) => p.id) } },
      data: { status: "archived" },
    }),
    db.eventItem.updateMany({
      where: { id: { in: events.map((e) => e.id) } },
      data: { status: "archived" },
    }),
  ]);

  await db.termArchive.create({
    data: {
      workspaceId: wid,
      label: `Term ${now.toISOString().slice(0, 7)}`,
      startedAt: now,
      endedAt: new Date(0),
      isCurrent: true,
    },
  });

  const members = await db.membership.findMany({
    where: { workspaceId: wid },
    include: { user: { select: { id: true } } },
  });
  await Promise.all(
    members.map((m) =>
      createNotification(
        wid,
        m.user.id,
        "New Term Started",
        `${actorName} ended the current term and started a new one.`,
        "term_archive",
      ),
    ),
  );

  return c.json({
    success: true,
    archived: {
      tasks: tasks.length,
      proposals: proposals.length,
      events: events.length,
    },
  });
});

route.get("/archive", async (c) => {
  const wid = c.get("workspaceId");
  const terms = await db.termArchive.findMany({
    where: { workspaceId: wid },
    orderBy: { endedAt: "desc" },
  });
  return c.json(terms);
});

route.get("/archive/:id", async (c) => {
  const wid = c.get("workspaceId");
  const term = await db.termArchive.findFirst({
    where: { id: c.req.param("id"), workspaceId: wid },
  });
  if (!term) return c.json({ error: "Not found" }, 404);
  return c.json(term);
});

export default route;
