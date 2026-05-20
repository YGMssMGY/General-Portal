import { Hono } from "hono";
import { requireApiKey } from "../middleware/api-auth.js";
import { rateLimiter } from "hono-rate-limiter";

const route = new Hono();
route.use(
    "/*",
    rateLimiter({
        windowMs: 15 * 1000,
        limit: 30,
        standardHeaders: true,
        keyGenerator: (c) => c.req.header("x-forwarded-for") || "api-key",
    }),
);
route.use("/*", requireApiKey);

function pagination(c: any) {
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "20", 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

route.get("/v1/tasks", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const p = pagination(c);
    const status = c.req.query("status");
    const where: any = { workspaceId: wid };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
        db.taskItem.findMany({
            where,
            skip: p.skip,
            take: p.limit,
            orderBy: { createdAt: "desc" },
        }),
        db.taskItem.count({ where }),
    ]);
    return c.json({ data, total, page: p.page, limit: p.limit });
});

route.get("/v1/events", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const p = pagination(c);
    const status = c.req.query("status");
    const where: any = { workspaceId: wid };
    if (status) where.status = status;
    const [data, total] = await Promise.all([
        db.eventItem.findMany({
            where,
            skip: p.skip,
            take: p.limit,
            orderBy: { createdAt: "desc" },
        }),
        db.eventItem.count({ where }),
    ]);
    return c.json({ data, total, page: p.page, limit: p.limit });
});

route.get("/v1/proposals", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const p = pagination(c);
    const where: any = { workspaceId: wid };
    const [data, total] = await Promise.all([
        db.proposal.findMany({
            where,
            skip: p.skip,
            take: p.limit,
            orderBy: { submittedAt: "desc" },
        }),
        db.proposal.count({ where }),
    ]);
    return c.json({ data, total, page: p.page, limit: p.limit });
});

export default route;
