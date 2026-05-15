import { Hono } from "hono";
import { prisma } from "../lib/db.js";

const route = new Hono();

route.get("/search", async (c) => {
  const wid = c.get("workspaceId");
  const q = c.req.query("q") || "";
  if (!q.trim()) return c.json([]);

  const query = q.trim();

  const [tasks, proposals, events, files, finance] = await Promise.all([
    prisma.taskItem.findMany({
      where: {
        workspaceId: wid,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { project: { contains: query, mode: "insensitive" } },
          { assigneeName: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
    prisma.proposal.findMany({
      where: {
        workspaceId: wid,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { submittedBy: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
    prisma.eventItem.findMany({
      where: {
        workspaceId: wid,
        title: { contains: query, mode: "insensitive" },
      },
      take: 5,
    }),
    prisma.workspaceFile.findMany({
      where: {
        workspaceId: wid,
        name: { contains: query, mode: "insensitive" },
      },
      take: 5,
    }),
    prisma.financeTransaction.findMany({
      where: {
        workspaceId: wid,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { submittedBy: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 5,
    }),
  ]);

  const results = [
    ...tasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      title: t.title,
      description: t.project || "",
      status: t.status,
    })),
    ...proposals.map((p) => ({
      type: "proposal" as const,
      id: p.id,
      title: p.title,
      description: p.summary || "",
      status: p.status,
    })),
    ...events.map((e) => ({
      type: "event" as const,
      id: e.id,
      title: e.title,
      description: "",
      status: e.status,
    })),
    ...files.map((f) => ({
      type: "file" as const,
      id: f.id,
      title: f.name,
      description: f.fileType,
      status: "",
    })),
    ...finance.map((f) => ({
      type: "finance" as const,
      id: f.id,
      title: f.title,
      description: `$${f.amount}`,
      status: f.status,
    })),
  ];

  return c.json(results);
});

export default route;
