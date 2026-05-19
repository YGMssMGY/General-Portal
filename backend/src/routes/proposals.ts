import { Hono } from "hono";
import { getAuthUser } from "@hono/auth-js";
import { z } from "zod";
import { writeAuditLog } from "../lib/audit.js";
import { createNotification } from "../lib/notifications.js";

const route = new Hono();

const APPROVAL_STEPS = ["submitted", "officer_review", "president_review", "approved"];

const CAN_APPROVE: Record<string, string[]> = {
	submitted: ["officer", "president", "admin"],
	officer_review: ["president", "admin"],
	president_review: ["admin"],
};

const createSchema = z.object({
	title: z.string().min(1),
	type: z.string(),
	summary: z.string().optional(),
	budget: z.number().optional(),
	submittedBy: z.string(),
	dateNeeded: z.string().optional(),
	approvalStep: z.string().optional(),
});

const updateSchema = z.object({
	title: z.string().optional(),
	type: z.string().optional(),
	status: z.string().optional(),
	summary: z.string().optional(),
	budget: z.number().optional(),
	dateNeeded: z.string().optional(),
	approvalStep: z.string().optional(),
});

const attachmentSchema = z.object({
	name: z.string().min(1),
	fileType: z.string().optional(),
	sizeLabel: z.string().optional(),
	storageKey: z.string().optional(),
});

// ── CRUD ──

route.get("/proposals", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const status = c.req.query("status");
	const type = c.req.query("type");
	const where: any = { workspaceId: wid };
	if (status) where.status = status;
	if (type) where.type = type;
	const items = await db.proposal.findMany({
		where,
		orderBy: { submittedAt: "desc" },
	});
	return c.json(items);
});

route.post("/proposals", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const body = await c.req.json();
	const parsed = createSchema.parse(body);
	const item = await db.proposal.create({
		data: {
			workspaceId: wid,
			title: parsed.title,
			type: parsed.type as any,
			summary: parsed.summary,
			budget: parsed.budget || 0,
			submittedBy: parsed.submittedBy,
			submittedAt: new Date(),
			dateNeeded: parsed.dateNeeded ? new Date(parsed.dateNeeded) : null,
		},
	});
	return c.json(item, 201);
});

route.patch("/proposals/:id", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = updateSchema.parse(body);
	const data: any = { ...parsed };
	if (parsed.dateNeeded) data.dateNeeded = new Date(parsed.dateNeeded);
	const item = await db.proposal.update({
		where: { id, workspaceId: wid },
		data,
	});
	return c.json(item);
});

route.delete("/proposals/:id", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	await db.proposal.delete({
		where: { id: c.req.param("id"), workspaceId: wid },
	});
	return c.body(null, 204);
});

// ── Attachments ──

route.post("/proposals/:id/attachments", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const id = c.req.param("id");
	const body = await c.req.json();
	const parsed = attachmentSchema.parse(body);
	await db.proposal.findFirstOrThrow({
		where: { id, workspaceId: wid },
	});
	const item = await db.proposalAttachment.create({
		data: {
			proposalId: id,
			name: parsed.name,
			fileType: parsed.fileType || "Other",
			sizeLabel: parsed.sizeLabel,
			storageKey: parsed.storageKey,
		},
	});
	return c.json(item, 201);
});

route.delete("/proposals/:id/attachments/:attachmentId", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const { id, attachmentId } = c.req.param();
	const existing = await db.proposalAttachment.findFirst({
		where: { id: attachmentId, proposal: { id, workspaceId: wid } },
	});
	if (!existing) return c.json({ error: "Not found" }, 404);
	await db.proposalAttachment.delete({ where: { id: attachmentId } });
	return c.body(null, 204);
});

// ── Approval Flow ──

const approveSchema = z.object({
	comment: z.string().optional(),
});

const rejectSchema = z.object({
	reason: z.string().min(1, "Reason is required"),
});

function getNextStep(current: string): string | null {
	const idx = APPROVAL_STEPS.indexOf(current);
	if (idx === -1 || idx >= APPROVAL_STEPS.length - 1) return null;
	return APPROVAL_STEPS[idx + 1];
}

route.post("/proposals/:id/approve", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const id = c.req.param("id");
	const auth = await getAuthUser(c);
	const userId = (auth?.token as any)?.id as string;
	const userName = (auth?.token as any)?.name as string;
	const role = (((auth?.token as any)?.role as string) || "").toLowerCase();
	const body = await c.req.json().catch(() => ({}));
	const parsed = approveSchema.parse(body);

	const proposal = await db.proposal.findFirst({
		where: { id, workspaceId: wid },
	});
	if (!proposal) return c.json({ error: "Not found" }, 404);

	const currentStep = proposal.approvalStep;
	const allowedRoles = CAN_APPROVE[currentStep];
	if (!allowedRoles) return c.json({ error: "Proposal is already fully approved" }, 400);
	if (!allowedRoles.includes(role))
		return c.json({ error: "Insufficient role to approve at this step" }, 403);

	const nextStep = getNextStep(currentStep);
	if (!nextStep) return c.json({ error: "Proposal is already fully approved" }, 400);

	const history: any[] = proposal.approvalHistory ? JSON.parse(proposal.approvalHistory) : [];
	history.push({
		step: nextStep,
		approverId: userId,
		approverName: userName,
		action: "approved",
		comment: parsed.comment || "",
		timestamp: new Date().toISOString(),
	});

	const updateData: any = {
		approvalStep: nextStep,
		approvalHistory: JSON.stringify(history),
	};
	if (nextStep === "approved") updateData.status = "approved";

	await db.proposal.update({ where: { id }, data: updateData });

	await writeAuditLog(db, wid, {
		actorId: userId,
		actorName: userName,
		action: `proposal.approved.${nextStep}`,
		resourceType: "Proposal",
		resourceId: id,
		resourceTitle: proposal.title,
		metadata: JSON.stringify({
			fromStep: currentStep,
			toStep: nextStep,
			comment: parsed.comment,
		}),
	});

	if (nextStep !== "approved") {
		const nextRoles = CAN_APPROVE[nextStep];
		if (nextRoles) {
			const nextApprovers = await db.membership.findMany({
				where: {
					workspaceId: wid,
					position: {
						in: nextRoles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)),
					},
				},
				select: { userId: true },
			});
			for (const m of nextApprovers) {
				await createNotification(
					db,
					wid,
					m.userId,
					"Proposal Needs Review",
					`${proposal.title} has advanced to ${nextStep.replace("_", " ")} and needs your review.`,
					"proposal_review",
					"Proposal",
					id,
				);
			}
		}
	} else {
		const submitter = await db.user.findFirst({
			where: { displayName: proposal.submittedBy },
			select: { id: true },
		});
		if (submitter) {
			await createNotification(
				db,
				wid,
				submitter.id,
				"Proposal Approved",
				`Your proposal "${proposal.title}" has been fully approved.`,
				"proposal_approved",
				"Proposal",
				id,
			);
		}
	}

	return c.json({ ...proposal, ...updateData });
});

route.post("/proposals/:id/reject", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const id = c.req.param("id");
	const auth = await getAuthUser(c);
	const userId = (auth?.token as any)?.id as string;
	const userName = (auth?.token as any)?.name as string;
	const role = (((auth?.token as any)?.role as string) || "").toLowerCase();
	const body = await c.req.json();
	const parsed = rejectSchema.parse(body);

	const proposal = await db.proposal.findFirst({
		where: { id, workspaceId: wid },
	});
	if (!proposal) return c.json({ error: "Not found" }, 404);

	const allowedRoles = CAN_APPROVE[proposal.approvalStep];
	if (!allowedRoles || !allowedRoles.includes(role))
		return c.json({ error: "Insufficient role to reject at this step" }, 403);

	const history: any[] = proposal.approvalHistory ? JSON.parse(proposal.approvalHistory) : [];
	history.push({
		step: proposal.approvalStep,
		approverId: userId,
		approverName: userName,
		action: "rejected",
		comment: parsed.reason,
		timestamp: new Date().toISOString(),
	});

	await db.proposal.update({
		where: { id },
		data: { status: "rejected", approvalHistory: JSON.stringify(history) },
	});

	await writeAuditLog(db, wid, {
		actorId: userId,
		actorName: userName,
		action: "proposal.rejected",
		resourceType: "Proposal",
		resourceId: id,
		resourceTitle: proposal.title,
		metadata: JSON.stringify({
			reason: parsed.reason,
			atStep: proposal.approvalStep,
		}),
	});

	const submitter = await db.user.findFirst({
		where: { displayName: proposal.submittedBy },
		select: { id: true },
	});
	if (submitter) {
		await createNotification(
			db,
			wid,
			submitter.id,
			"Proposal Rejected",
			`Your proposal "${proposal.title}" was rejected at ${proposal.approvalStep} stage. Reason: ${parsed.reason}`,
			"proposal_rejected",
			"Proposal",
			id,
		);
	}

	return c.json({
		...proposal,
		status: "rejected",
		approvalHistory: JSON.stringify(history),
	});
});

route.get("/proposals/:id/approval-history", async (c) => {
	const db = c.get("db");
	const wid = c.get("workspaceId");
	const id = c.req.param("id");
	const proposal = await db.proposal.findFirst({
		where: { id, workspaceId: wid },
		select: { approvalHistory: true, approvalStep: true, status: true },
	});
	if (!proposal) return c.json({ error: "Not found" }, 404);
	const history = proposal.approvalHistory ? JSON.parse(proposal.approvalHistory) : [];
	return c.json({
		approvalStep: proposal.approvalStep,
		status: proposal.status,
		history,
	});
});

export default route;
