import type {
	TaskItem,
	User,
	Proposal,
	EventItem,
	Workspace,
	Membership,
	FinanceTransaction,
} from "@prisma/client";

function id(): string {
	return crypto.randomUUID();
}

export function buildTask(overrides?: Partial<TaskItem>): Partial<TaskItem> {
	return {
		id: id(),
		title: "Test Task",
		status: "todo",
		priority: "medium",
		project: "Test Project",
		dueDate: new Date(Date.now() + 86400000),
		assigneeName: "Test User",
		progress: 0,
		blockedReason: null,
		position: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		workspaceId: "00000000-0000-0000-0000-000000000002",
		...overrides,
	};
}

export function buildUser(overrides?: Partial<User>): Partial<User> {
	return {
		id: id(),
		email: "test@example.edu",
		name: "Test User",
		password: null,
		emailVerified: null,
		image: null,
		xp: 0,
		level: 1,
		streak: 0,
		lastLoginAt: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function buildProposal(overrides?: Partial<Proposal>): Partial<Proposal> {
	return {
		id: id(),
		title: "Test Proposal",
		type: "Event",
		status: "submitted",
		approvalStep: "submitted",
		approvalHistory: null,
		submittedBy: "Test User",
		submittedAt: new Date(),
		dateNeeded: null,
		budget: 0,
		summary: "A test proposal summary.",
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		workspaceId: "00000000-0000-0000-0000-000000000002",
		...overrides,
	};
}

export function buildEvent(overrides?: Partial<EventItem>): Partial<EventItem> {
	return {
		id: id(),
		title: "Test Event",
		status: "pending",
		startsAt: new Date(Date.now() + 7 * 86400000),
		endsAt: null,
		progress: 0,
		budgetUsed: 0,
		budgetTotal: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		deletedAt: null,
		workspaceId: "00000000-0000-0000-0000-000000000002",
		...overrides,
	};
}

export function buildWorkspace(overrides?: Partial<Workspace>): Partial<Workspace> {
	return {
		id: id(),
		name: "Test Workspace",
		description: "A test workspace",
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

export function buildMembership(overrides?: Partial<Membership>): Partial<Membership> {
	return {
		id: id(),
		position: "Member",
		accessLabel: "Member",
		taskCount: 0,
		volunteerHours: 0,
		createdAt: new Date(),
		updatedAt: new Date(),
		workspaceId: "00000000-0000-0000-0000-000000000002",
		userId: "00000000-0000-0000-0000-000000000001",
		...overrides,
	};
}

export function buildFinanceTransaction(
	overrides?: Partial<FinanceTransaction>,
): Partial<FinanceTransaction> {
	return {
		id: id(),
		title: "Test Transaction",
		category: "Other",
		status: "pending",
		submittedBy: "Test User",
		amount: 100,
		type: "expense",
		notes: null,
		occurredAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
		budgetId: null,
		workspaceId: "00000000-0000-0000-0000-000000000002",
		...overrides,
	};
}
