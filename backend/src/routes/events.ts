import { Hono } from "hono";

const route = new Hono();

route.get("/events", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const status = c.req.query("status");
    const dateFrom = c.req.query("dateFrom");
    const where: any = { workspaceId: wid };
    if (status) where.status = status;
    if (dateFrom) where.startsAt = { gte: new Date(dateFrom) };
    const items = await db.eventItem.findMany({
        where,
        include: { owners: true },
        orderBy: { createdAt: "desc" },
    });
    const mapped = items.map((item: any) => ({
        ...item,
        ownerNames: item.owners.map((o: any) => o.ownerLabel),
    }));
    return c.json(mapped);
});

route.post("/events", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const body = await c.req.json();
    if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
        return c.json({ error: "endsAt must be after startsAt" }, 400);
    }
    const data: any = {
        workspaceId: wid,
        title: body.title,
        status: body.status || "pending",
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        progress: body.progress || 0,
        budgetUsed: body.budgetUsed || 0,
        budgetTotal: body.budgetTotal || 0,
    };
    const ownerLabels = body.owners || body.ownerNames;
    const ownerIds: string[] = body.ownerIds || [];
    const allOwners: { ownerLabel: string; userId?: string }[] = [];

    if (Array.isArray(ownerLabels) && ownerLabels.length > 0) {
        for (const label of ownerLabels) {
            allOwners.push({ ownerLabel: label });
        }
    }

    if (Array.isArray(ownerIds) && ownerIds.length > 0) {
        const users = await db.user.findMany({
            where: { id: { in: ownerIds } },
            select: { id: true, name: true },
        });
        const userMap = new Map(users.map((u: any) => [u.id, u.name]));
        for (const uid of ownerIds) {
            const name = userMap.get(uid);
            if (name) allOwners.push({ ownerLabel: name, userId: uid });
        }
    }

    if (allOwners.length > 0) {
        data.owners = { create: allOwners };
    }
    const item = await db.eventItem.create({ data, include: { owners: true } });
    return c.json(item, 201);
});

route.patch("/events/:id", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const body = await c.req.json();
    if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
        return c.json({ error: "endsAt must be after startsAt" }, 400);
    }
    const existing = await db.eventItem.findFirst({ where: { id, workspaceId: wid } });
    if (!existing) return c.json({ error: "Event not found" }, 404);

    const { owners, ownerNames, ownerIds: _ownerIds, ...fields } = body;
    const data: any = { ...fields };
    if (fields.startsAt) data.startsAt = new Date(fields.startsAt);
    if (fields.endsAt) data.endsAt = new Date(fields.endsAt);

    // Handle owner updates: delete existing and recreate
    const ownerLabels = owners || ownerNames;
    if (ownerLabels) {
        await db.eventOwner.deleteMany({ where: { eventId: id } });
        await db.eventOwner.createMany({
            data: ownerLabels.map((o: string) => ({ eventId: id, ownerLabel: o })),
        });
    }

    const item = await db.eventItem.update({
        where: { id, workspaceId: wid },
        data,
        include: { owners: true },
    });
    return c.json({
        ...item,
        ownerNames: (item as any).owners.map((o: any) => o.ownerLabel),
    });
});

route.delete("/events/:id", async (c) => {
    const db = c.get("db");
    const wid = c.get("workspaceId");
    const id = c.req.param("id");
    const existing = await db.eventItem.findFirst({ where: { id, workspaceId: wid } });
    if (!existing) return c.json({ error: "Event not found" }, 404);
    await db.eventItem.delete({ where: { id } });
    return c.body(null, 204);
});

export default route;
