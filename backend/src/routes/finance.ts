import { Hono } from "hono";
import { z } from "zod";

const route = new Hono();

const createSchema = z.object({
	title: z.string().min(1),
	category: z.string(),
	status: z.string().optional(),
	submittedBy: z.string(),
	submittedById: z.string().optional(),
	amount: z.number(),
	type: z.string().optional(),
	notes: z.string().optional(),
	occurredAt: z.string().optional(),
});

const updateSchema = z.object({
	title: z.string().optional(),
	category: z.string().optional(),
	status: z.string().optional(),
	submittedBy: z.string().optional(),
	amount: z.number().optional(),
	type: z.string().optional(),
	notes: z.string().optional(),
	occurredAt: z.string().optional(),
});

const attachmentSchema = z.object({
	name: z.string().min(1),
	fileType: z.string().optional(),
	sizeLabel: z.string().optional(),
	storageKey: z.string().optional(),
});

// ── Transaction CRUD ──

route.get("/finance/transactions", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const items = await db.financeTransaction.findMany({
		where: { workspaceId: wid },
		orderBy: { occurredAt: "desc" },
	});
	return c.json(items);
});

route.post("/finance/transactions", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const body = await c.req.json();
	const parsed = createSchema.parse(body);
	let submittedBy = parsed.submittedBy;
	if (parsed.submittedById && !submittedBy) {
		const user = await db.user.findUnique({
			where: { id: parsed.submittedById },
			select: { name: true },
		});
		if (user) submittedBy = user.name;
	}
	const item = await db.financeTransaction.create({
		data: {
			workspaceId: wid,
			title: parsed.title,
			category: parsed.category as any,
			status: (parsed.status || "pending") as any,
			submittedBy,
			submittedById: parsed.submittedById || null,
			amount: parsed.amount || 0,
			type: parsed.type || "expense",
			notes: parsed.notes,
			occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : new Date(),
		},
	});
	return c.json(item, 201);
});

route.patch("/finance/transactions/:id", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = updateSchema.parse(body);
	const data: any = { ...parsed };
	if (parsed.occurredAt) data.occurredAt = new Date(parsed.occurredAt);
	const item = await db.financeTransaction.update({
		where: { id, workspaceId: wid },
		data,
	});
	return c.json(item);
});

route.delete("/finance/transactions/:id", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	await db.financeTransaction.delete({
		where: { id: c.req.param("id"), workspaceId: wid },
	});
	return c.body(null, 204);
});

// ── Attachments ──

route.post("/finance/transactions/:id/attachments", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = attachmentSchema.parse(body);
	await db.financeTransaction.findFirstOrThrow({
		where: { id, workspaceId: wid },
	});
	const item = await db.financeAttachment.create({
		data: {
			transactionId: id,
			name: parsed.name,
			fileType: parsed.fileType || "Other",
			sizeLabel: parsed.sizeLabel,
			storageKey: parsed.storageKey,
		},
	});
	return c.json(item, 201);
});

route.delete("/finance/transactions/:id/attachments/:attachmentId", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const { id, attachmentId } = c.req.param();
	const existing = await db.financeAttachment.findFirst({
		where: { id: attachmentId, transaction: { id, workspaceId: wid } },
	});
	if (!existing) return c.json({ error: "Not found" }, 404);
	await db.financeAttachment.delete({ where: { id: attachmentId } });
	return c.body(null, 204);
});

// ── Summary ──

route.get("/finance/summary", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const [byType, pendingCount] = await Promise.all([
		db.financeTransaction.groupBy({
			by: ["type"],
			where: { workspaceId: wid },
			_sum: { amount: true },
		}),
		db.financeTransaction.count({
			where: { workspaceId: wid, status: "pending" },
		}),
	]);

	const totalRevenue = byType.find((t) => t.type === "revenue")?._sum.amount?.toNumber() || 0;
	const totalExpenses = byType.find((t) => t.type === "expense")?._sum.amount?.toNumber() || 0;

	return c.json({
		totalRevenue,
		totalExpenses,
		netBalance: totalRevenue - totalExpenses,
		pendingCount,
	});
});

// ── Trends ──

route.get("/finance/trends", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const days = parseInt(c.req.query("days") || "7", 10);
	const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

	const snapshots = await db.trendSnapshot.findMany({
		where: {
			workspaceId: wid,
			recordedAt: { gte: since },
			metricKey: { startsWith: "finance_" },
		},
		orderBy: { recordedAt: "asc" },
	});

	// Also return transaction totals by day for the period
	const transactions = await db.financeTransaction.findMany({
		where: {
			workspaceId: wid,
			occurredAt: { gte: since },
		},
		orderBy: { occurredAt: "asc" },
	});

	return c.json({
		snapshots,
		transactions,
		days,
	});
});

export default route;
