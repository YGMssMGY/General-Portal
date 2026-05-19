import { Hono } from "hono";

const route = new Hono();

function tsvectorFields(fields: string[]): string {
  return fields.map((f) => `coalesce("${f}", '')`).join(" || ' ' || ");
}

async function fullTextSearch(
  db: any,
  table: string,
  wid: string,
  query: string,
  searchFields: string[],
  limit: number,
  offset: number,
): Promise<any[] | null> {
  try {
    const searchable = tsvectorFields(searchFields);
    return await db.$queryRawUnsafe(
      `SELECT * FROM "${table}"
       WHERE "workspaceId" = $1
         AND to_tsvector('english', ${searchable}) @@ plainto_tsquery('english', $2)
       ORDER BY ts_rank(to_tsvector('english', ${searchable}), plainto_tsquery('english', $2)) DESC
       LIMIT $3 OFFSET $4`,
      wid,
      query,
      limit,
      offset,
    );
  } catch {
    return null; // signal fallback
  }
}

route.get("/search", async (c) => {
  const db = c.get("db");
  const wid = c.get("workspaceId");
  const q = c.req.query("q") || "";
  const type = c.req.query("type") || "";
  const limit = Math.min(parseInt(c.req.query("limit") || "5", 10), 20);
  const noTypeLimit = Math.min(parseInt(c.req.query("limit") || "3", 10), 20);
  const offset = parseInt(c.req.query("offset") || "0", 10);

  if (!q.trim()) return c.json([]);

  const query = q.trim();
  const validTypes = ["task", "proposal", "event", "file", "finance"];
  const filterType = type && validTypes.includes(type) ? type : "";
  const effectiveLimit = filterType ? limit : noTypeLimit;

  const queries: Promise<any[]>[] = [];

  async function searchType(
    typeName: string,
    table: string,
    fields: string[],
    mapFn: (row: any) => any,
  ) {
    const rows = await fullTextSearch(
      db,
      table,
      wid,
      query,
      fields,
      effectiveLimit,
      offset,
    );
    if (rows !== null) return rows.map(mapFn);

    const ors = fields.map((f) => ({
      [f]: { contains: query, mode: "insensitive" as const },
    }));
    const results = await (db as any)[table].findMany({
      where: { workspaceId: wid, OR: ors },
      skip: offset,
      take: effectiveLimit,
    });
    return results.map(mapFn);
  }

  if (!filterType || filterType === "task") {
    queries.push(
      searchType(
        "task",
        "taskItem",
        ["title", "project", "assigneeName"],
        (t: any) => ({
          type: "task" as const,
          id: t.id,
          title: t.title,
          description: t.project || "",
          status: t.status,
        }),
      ),
    );
  }

  if (!filterType || filterType === "proposal") {
    queries.push(
      searchType(
        "proposal",
        "proposal",
        ["title", "submittedBy", "summary"],
        (p: any) => ({
          type: "proposal" as const,
          id: p.id,
          title: p.title,
          description: p.summary || "",
          status: p.status,
        }),
      ),
    );
  }

  if (!filterType || filterType === "event") {
    queries.push(
      searchType("event", "eventItem", ["title"], (e: any) => ({
        type: "event" as const,
        id: e.id,
        title: e.title,
        description: "",
        status: e.status,
      })),
    );
  }

  if (!filterType || filterType === "file") {
    queries.push(
      searchType("file", "workspaceFile", ["name"], (f: any) => ({
        type: "file" as const,
        id: f.id,
        title: f.name,
        description: f.fileType,
        status: "",
      })),
    );
  }

  if (!filterType || filterType === "finance") {
    queries.push(
      searchType(
        "finance",
        "financeTransaction",
        ["title", "submittedBy", "notes"],
        (f: any) => ({
          type: "finance" as const,
          id: f.id,
          title: f.title,
          description: `$${f.amount}`,
          status: f.status,
        }),
      ),
    );
  }

  const results = (await Promise.all(queries)).flat();
  return c.json(results);
});

export default route;
