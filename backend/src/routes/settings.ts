import { Hono } from "hono";
import { z } from "zod";
import { writeFile, readFile } from "fs/promises";

const UPLOADS_DIR = process.cwd() + "/uploads";

const route = new Hono();

// ── Workspace Settings ──

route.get("/settings", async (c) => {
	const wid = c.get("workspaceId");
	const db = c.get("db");
	let settings = await db.workspaceSettings.findUnique({
		where: { workspaceId: wid },
	});
	if (!settings) {
		settings = await db.workspaceSettings.create({
			data: { workspaceId: wid },
		});
	}
	return c.json(settings);
});

route.patch("/settings", async (c) => {
	const wid = c.get("workspaceId");
	const body = await c.req.json();
	const data: any = {};
	if (body.defaultVisibility !== undefined) data.defaultVisibility = body.defaultVisibility;
	if (body.requireProposalApproval !== undefined)
		data.requireProposalApproval = body.requireProposalApproval;
	if (body.allowMemberInvites !== undefined) data.allowMemberInvites = body.allowMemberInvites;
	if (body.fiscalYearStart !== undefined) data.fiscalYearStart = body.fiscalYearStart;
	if (body.organizationType !== undefined) data.organizationType = body.organizationType;
	if (body.primaryContactEmail !== undefined) data.primaryContactEmail = body.primaryContactEmail;
	if (body.teamsWebhookUrl !== undefined) data.teamsWebhookUrl = body.teamsWebhookUrl;
	if (body.webhookUrl !== undefined) data.webhookUrl = body.webhookUrl;

	const db = c.get("db");
	const settings = await db.workspaceSettings.upsert({
		where: { workspaceId: wid },
		update: data,
		create: { workspaceId: wid, ...data },
	});
	return c.json(settings);
});

// ── Module Toggle ──

route.get("/modules", async (c) => {
	const wid = c.get("workspaceId");
	const db = c.get("db");
	const modules = await db.workspaceModule.findMany({
		where: { workspaceId: wid },
		orderBy: { moduleKey: "asc" },
	});
	return c.json(modules);
});

const moduleSchema = z.object({
	moduleKey: z.string().min(1),
	enabled: z.boolean(),
});

route.patch("/modules", async (c) => {
	const wid = c.get("workspaceId");
	const body = await c.req.json();
	const parsed = moduleSchema.parse(body);

	const db = c.get("db");
	const item = await db.workspaceModule.upsert({
		where: {
			workspaceId_moduleKey: { workspaceId: wid, moduleKey: parsed.moduleKey },
		},
		update: { enabled: parsed.enabled },
		create: {
			workspaceId: wid,
			moduleKey: parsed.moduleKey,
			enabled: parsed.enabled,
		},
	});
	return c.json(item);
});

// ── Approval Rules ──

const ruleSchema = z.object({
	triggerType: z.string().min(1),
	triggerValue: z.string().min(1),
	approverIds: z.string().min(1),
});

route.get("/modules/rules", async (c) => {
	const wid = c.get("workspaceId");
	const db = c.get("db");
	const rules = await db.approvalRule.findMany({
		where: { workspaceId: wid },
		orderBy: { createdAt: "desc" },
	});
	return c.json(rules);
});

route.post("/modules/rules", async (c) => {
	const wid = c.get("workspaceId");
	const body = await c.req.json();
	const parsed = ruleSchema.parse(body);
	const db = c.get("db");
	const rule = await db.approvalRule.create({
		data: {
			workspaceId: wid,
			triggerType: parsed.triggerType,
			triggerValue: parsed.triggerValue,
			approverIds: parsed.approverIds,
		},
	});
	return c.json(rule, 201);
});

route.delete("/modules/rules/:id", async (c) => {
	const wid = c.get("workspaceId");
	const db = c.get("db");
	const existing = await db.approvalRule.findFirst({
		where: { id: c.req.param("id"), workspaceId: wid },
	});
	if (!existing) return c.json({ error: "Not found" }, 404);
	await db.approvalRule.delete({ where: { id: existing.id } });
	return c.body(null, 204);
});

// ── Logo Upload ──

route.post("/workspace/logo", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const body = await c.req.parseBody();
	const file = body["logo"] as File | undefined;
	if (!file) return c.json({ error: "No logo file provided" }, 400);

	const ext = file.name.split(".").pop() || "png";
	const storageKey = `logo_${wid}.${ext}`;
	const buffer = Buffer.from(await file.arrayBuffer());

	await writeFile(UPLOADS_DIR + "/" + storageKey, buffer);

	// Upsert a workspace file record with the logo convention
	const existing = await db.workspaceFile.findFirst({
		where: { workspaceId: wid, name: "_workspace_logo" },
	});
	if (existing) {
		await db.workspaceFile.update({
			where: { id: existing.id },
			data: {
				storageKey,
				name: "_workspace_logo",
				fileType: "Image",
				fileUpdatedAt: new Date(),
			},
		});
	} else {
		await db.workspaceFile.create({
			data: {
				workspaceId: wid,
				name: "_workspace_logo",
				fileType: "Image",
				ownerName: "System",
				sizeLabel: `${(buffer.length / 1024).toFixed(1)} KB`,
				storageKey,
			},
		});
	}

	return c.json({ storageKey }, 201);
});

route.get("/workspace/logo", async (c) => {
	const wid = c.get("workspaceId");
	const db = c.get("db");
	const record = await db.workspaceFile.findFirst({
		where: { workspaceId: wid, name: "_workspace_logo" },
	});
	if (!record || !record.storageKey) return c.json({ error: "No logo uploaded" }, 404);

	const filePath = UPLOADS_DIR + "/" + record.storageKey;
	let content: Buffer;
	try {
		content = await readFile(filePath);
	} catch {
		return c.json({ error: "Logo file not found" }, 404);
	}

	c.header("Content-Type", "image/png");
	c.header("Cache-Control", "public, max-age=3600");
	return c.body(new Uint8Array(content));
});

export default route;
