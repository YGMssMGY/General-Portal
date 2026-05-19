import { getDb } from "../lib/db.js";
import { PrismaClient } from "@prisma/client";
import { createNotification } from "../lib/notifications.js";
import { writeAuditLog } from "../lib/audit.js";

const PORTALS = ["developers", "stuco"];

export async function runNudges() {
	await Promise.all(PORTALS.map((portal) => runNudgesForPortal(portal)));
}

async function runNudgesForPortal(portal: string) {
	const db = getDb(portal);
	const workspaces = await db.workspace.findMany({ select: { id: true } });

	for (const ws of workspaces) {
		await Promise.all([
			nudgeTasksDueSoon(db, ws.id),
			nudgeTasksOverdue(db, ws.id),
			nudgeProposalsPending(db, ws.id),
			nudgeEventsStartingSoon(db, ws.id),
		]);
	}
}

async function nudgeTasksDueSoon(db: PrismaClient, workspaceId: string) {
	const now = new Date();
	const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

	const tasks = await db.taskItem.findMany({
		where: {
			workspaceId,
			status: { not: "done" },
			dueDate: { gte: now, lte: in24h },
		},
	});

	for (const task of tasks) {
		if (!task.assigneeName) continue;

		const assignee = await db.user.findFirst({
			where: { name: task.assigneeName },
			select: { id: true },
		});
		if (!assignee) continue;

		await createNotification(
			db,
			workspaceId,
			assignee.id,
			"Task Due Soon",
			`"${task.title}" is due within 24 hours.`,
			"task_due_soon",
			"Task",
			task.id,
		);

		await writeAuditLog(db, workspaceId, {
			action: "nudge.task_due_soon",
			actorName: "auto-pilot",
			resourceType: "Task",
			resourceId: task.id,
			resourceTitle: task.title,
			metadata: JSON.stringify({ assignee: task.assigneeName }),
		});
	}
}

async function nudgeTasksOverdue(db: PrismaClient, workspaceId: string) {
	const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

	const tasks = await db.taskItem.findMany({
		where: {
			workspaceId,
			status: { not: "done" },
			dueDate: { lt: threeDaysAgo },
		},
	});

	for (const task of tasks) {
		if (!task.assigneeName) continue;

		const supervisors = await db.membership.findMany({
			where: { workspaceId, position: { in: ["President", "Admin"] } },
			select: { userId: true },
		});

		for (const sup of supervisors) {
			await createNotification(
				db,
				workspaceId,
				sup.userId,
				"Task Overdue - Escalated",
				`Task "${task.title}" assigned to ${task.assigneeName} is overdue by more than 3 days.`,
				"task_escalated",
				"Task",
				task.id,
			);
		}

		await writeAuditLog(db, workspaceId, {
			action: "nudge.task_escalated",
			actorName: "auto-pilot",
			resourceType: "Task",
			resourceId: task.id,
			resourceTitle: task.title,
			metadata: JSON.stringify({ assignee: task.assigneeName, overdueDays: 3 }),
		});
	}
}

async function nudgeProposalsPending(db: PrismaClient, workspaceId: string) {
	const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

	const proposals = await db.proposal.findMany({
		where: {
			workspaceId,
			status: { notIn: ["approved", "rejected"] },
			createdAt: { lt: twoDaysAgo },
		},
	});

	for (const proposal of proposals) {
		const step = proposal.approvalStep;
		const roles =
			step === "submitted"
				? ["Officer", "President", "Admin"]
				: step === "officer_review"
					? ["President", "Admin"]
					: ["Admin"];

		const reviewers = await db.membership.findMany({
			where: { workspaceId, position: { in: roles } },
			select: { userId: true },
		});

		for (const r of reviewers) {
			await createNotification(
				db,
				workspaceId,
				r.userId,
				"Proposal Pending Review",
				`"${proposal.title}" has been awaiting ${step.replace("_", " ")} review for over 48 hours.`,
				"proposal_pending",
				"Proposal",
				proposal.id,
			);
		}

		await writeAuditLog(db, workspaceId, {
			action: "nudge.proposal_pending",
			actorName: "auto-pilot",
			resourceType: "Proposal",
			resourceId: proposal.id,
			resourceTitle: proposal.title,
			metadata: JSON.stringify({ step: proposal.approvalStep }),
		});
	}
}

async function nudgeEventsStartingSoon(db: PrismaClient, workspaceId: string) {
	const now = new Date();
	const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

	const events = await db.eventItem.findMany({
		where: {
			workspaceId,
			startsAt: { gte: now, lte: in24h },
			status: { notIn: ["cancelled", "completed"] },
		},
		include: { owners: true },
	});

	for (const event of events) {
		const checkinCount = await db.checkIn.count({
			where: { eventId: event.id },
		});

		if (event.owners.length > 0 && checkinCount < 2) {
			for (const owner of event.owners) {
				const ownerUser = await db.user.findFirst({
					where: { name: { contains: owner.ownerLabel } },
					select: { id: true },
				});
				if (!ownerUser) continue;

				await createNotification(
					db,
					workspaceId,
					ownerUser.id,
					"Event Starting Soon - Low Attendance",
					`"${event.title}" starts within 24 hours but only has ${checkinCount} registered.`,
					"event_low_rsvp",
					"Event",
					event.id,
				);
			}
		}

		await writeAuditLog(db, workspaceId, {
			action: "nudge.event_starting_soon",
			actorName: "auto-pilot",
			resourceType: "Event",
			resourceId: event.id,
			resourceTitle: event.title,
			metadata: JSON.stringify({
				checkinCount,
				ownerCount: event.owners.length,
			}),
		});
	}
}
