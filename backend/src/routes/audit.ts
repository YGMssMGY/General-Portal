import { Hono } from "hono";
import { getAuthUser } from "../lib/get-auth-user.js";

const OFFICER_ROLES = ["admin", "president", "officer"];
const route = new Hono();

route.get("/audit", async (c) => {
    const user = getAuthUser(c);
    const role = user.role;
    if (!OFFICER_ROLES.includes(role)) return c.json({ error: "Forbidden" }, 403);

    const workspaceId = c.get("workspaceId");
    const page = Math.max(1, parseInt(c.req.query("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "50")));
    const resourceType = c.req.query("resourceType");
    const actorName = c.req.query("actorName");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    const where: any = { workspaceId };
    if (resourceType) where.resourceType = resourceType;
    if (actorName) where.actorName = { contains: actorName };
    if (startDate || endDate) {
        where.occurredAt = {};
        if (startDate) where.occurredAt.gte = new Date(startDate);
        if (endDate) where.occurredAt.lte = new Date(endDate);
    }

    const db = c.get("db");
    const [logs, total] = await Promise.all([
        db.auditLog.findMany({
            where,
            orderBy: { occurredAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.auditLog.count({ where }),
    ]);

    return c.json({
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    });
});

route.get("/audit/export", async (c) => {
    const user = getAuthUser(c);
    const role = user.role;
    if (!OFFICER_ROLES.includes(role)) return c.json({ error: "Forbidden" }, 403);

    const workspaceId = c.get("workspaceId");
    const resourceType = c.req.query("resourceType");
    const actorName = c.req.query("actorName");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    const where: any = { workspaceId };
    if (resourceType) where.resourceType = resourceType;
    if (actorName) where.actorName = { contains: actorName };
    if (startDate || endDate) {
        where.occurredAt = {};
        if (startDate) where.occurredAt.gte = new Date(startDate);
        if (endDate) where.occurredAt.lte = new Date(endDate);
    }

    const db = c.get("db");
    const logs = await db.auditLog.findMany({
        where,
        orderBy: { occurredAt: "desc" },
    });

    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header =
        "ID,Actor Name,Action,Resource Type,Resource ID,Resource Title,IP Address,Timestamp";
    const rows = logs.map((l) =>
        [
            esc(l.id),
            esc(l.actorName),
            esc(l.action),
            esc(l.resourceType),
            esc(l.resourceId || ""),
            esc(l.resourceTitle || ""),
            esc(l.ipAddress || ""),
            esc(l.occurredAt.toISOString()),
        ].join(","),
    );

    const csv = [header, ...rows].join("\r\n");
    c.header("Content-Type", "text/csv");
    c.header("Content-Disposition", 'attachment; filename="audit-log.csv"');
    return c.body(csv, 200);
});

export default route;
