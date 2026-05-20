import { Hono } from "hono";
import { getAuthUser } from "../lib/get-auth-user.js";
import { z } from "zod";

const route = new Hono();

const createSchema = z.object({
	toUserId: z.string().min(1),
	message: z.string().min(1).max(500),
});

route.post("/kudos", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const user = getAuthUser(c);
	const fromUserId = user.id;

	const body = await c.req.json();
	const parsed = createSchema.parse(body);

	const recipient = await db.user.findUnique({
		where: { id: parsed.toUserId },
	});
	if (!recipient) return c.json({ error: "Recipient not found" }, 404);

	const kudos = await db.kudos.create({
		data: {
			workspaceId: wid,
			fromUserId,
			toUserId: parsed.toUserId,
			message: parsed.message,
		},
	});

	return c.json(kudos, 201);
});

route.get("/kudos", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const user = getAuthUser(c);
	const userId = user.id;

	const kudosList = await db.kudos.findMany({
		where: { workspaceId: wid, toUserId: userId },
		orderBy: { createdAt: "desc" },
		take: 50,
	});

	return c.json(kudosList);
});

route.get("/kudos/leaderboard", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");

	const kudos = await db.kudos.findMany({
		where: { workspaceId: wid },
		select: { toUserId: true },
	});

	const counts = new Map<string, number>();
	for (const k of kudos) {
		counts.set(k.toUserId, (counts.get(k.toUserId) || 0) + 1);
	}

	const sorted = Array.from(counts.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 20);

	if (sorted.length === 0) return c.json([]);

	const users = await db.user.findMany({
		where: { id: { in: sorted.map(([id]) => id) } },
		select: { id: true, name: true, email: true, image: true },
	});

	const userMap = new Map(users.map((u) => [u.id, u]));

	return c.json(
		sorted.map(([userId, count], i) => ({
			rank: i + 1,
			count,
			user: userMap.get(userId) || null,
		})),
	);
});

export default route;
