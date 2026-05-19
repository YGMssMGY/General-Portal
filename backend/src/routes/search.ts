import { Hono } from "hono";

const route = new Hono();

route.get("/search", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const q = c.req.query("q") || "";
  const type = c.req.query("type") || "";
  const limit = Math.min(parseInt(c.req.query("limit") || "5", 10), 20);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  if (!q.trim()) return c.json([]);

  const query = q.trim();
  const validTypes = ["task", "proposal", "event", "file", "finance"];
  const filterType = type && validTypes.includes(type) ? type : "";

  const queries: Promise<any>[] = [];

  if (!filterType || filterType === "task") {
    queries.push(
      db.taskItem
        .findMany({
          where: {
            workspaceId: wid,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { project: { contains: query, mode: "insensitive" } },
              { assigneeName: { contains: query, mode: "insensitive" } },
            ],
          },
          skip: offset,
          take: limit,
        })
        .then((tasks) =>
          tasks.map((t) => ({
            type: "task" as const,
            id: t.id,
            title: t.title,
            description: t.project || "",
            status: t.status,
          })),
        ),
    );
  }

  if (!filterType || filterType === "proposal") {
    queries.push(
      db.proposal
        .findMany({
          where: {
            workspaceId: wid,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { submittedBy: { contains: query, mode: "insensitive" } },
            ],
          },
          skip: offset,
          take: limit,
        })
        .then((proposals) =>
          proposals.map((p) => ({
            type: "proposal" as const,
            id: p.id,
            title: p.title,
            description: p.summary || "",
            status: p.status,
          })),
        ),
    );
  }

  if (!filterType || filterType === "event") {
    queries.push(
      db.eventItem
        .findMany({
          where: {
            workspaceId: wid,
            title: { contains: query, mode: "insensitive" },
          },
          skip: offset,
          take: limit,
        })
        .then((events) =>
          events.map((e) => ({
            type: "event" as const,
            id: e.id,
            title: e.title,
            description: "",
            status: e.status,
          })),
        ),
    );
  }

  if (!filterType || filterType === "file") {
    queries.push(
      db.workspaceFile
        .findMany({
          where: {
            workspaceId: wid,
            name: { contains: query, mode: "insensitive" },
          },
          skip: offset,
          take: limit,
        })
        .then((files) =>
          files.map((f) => ({
            type: "file" as const,
            id: f.id,
            title: f.name,
            description: f.fileType,
            status: "",
          })),
        ),
    );
  }

  if (!filterType || filterType === "finance") {
    queries.push(
      db.financeTransaction
        .findMany({
          where: {
            workspaceId: wid,
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { submittedBy: { contains: query, mode: "insensitive" } },
            ],
          },
          skip: offset,
          take: limit,
        })
        .then((finance) =>
          finance.map((f) => ({
            type: "finance" as const,
            id: f.id,
            title: f.title,
            description: `$${f.amount}`,
            status: f.status,
          })),
        ),
    );
  }

  const results = (await Promise.all(queries)).flat();

  return c.json(results);
});

export default route;
