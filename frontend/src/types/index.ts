export type UserRole = "admin" | "president" | "officer" | "member";

export type ResourceStatus =
	| "draft"
	| "submitted"
	| "pending"
	| "under_review"
	| "approved"
	| "rejected"
	| "active"
	| "completed"
	| "blocked";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";

export type Priority = "low" | "medium" | "high";

export interface UserProfile {
	id: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
	role: UserRole;
	workspaceName: string;
	permissions?: string[];
	xp?: number;
	level?: number;
	streak?: number;
}

export interface Workspace {
	id: string;
	name: string;
	description: string;
}

export interface DashboardMetric {
	label: string;
	value: string;
	tone: "primary" | "secondary" | "tertiary" | "danger" | "neutral";
	icon: string;
}

export interface Task {
	id: string;
	title: string;
	status: TaskStatus;
	priority: Priority;
	project: string;
	dueDate: string;
	assigneeName: string;
	progress: number;
	blockedReason?: string;
}

export interface Proposal {
	id: string;
	title: string;
	type: "Event" | "Purchase" | "Project";
	status: ResourceStatus;
	submittedBy: string;
	submittedAt: string;
	budget: number;
	summary: string;
	rejectionReason?: string;
}

export interface EventOwner {
	id: string;
	ownerLabel: string;
}

export interface EventItem {
	id: string;
	title: string;
	status: ResourceStatus;
	startsAt: string;
	endsAt?: string;
	progress: number;
	budgetUsed: number;
	budgetTotal: number;
	owners: EventOwner[];
}

export interface VolunteerSlot {
	id: string;
	title: string;
	eventName: string;
	startsAt: string;
	capacity: number;
	filled: number;
	hours: number;
}

export interface FinanceTransaction {
	id: string;
	title: string;
	category: string;
	status: ResourceStatus;
	submittedBy: string;
	amount: number;
	occurredAt: string;
}

export interface Message {
	id: string;
	authorName: string;
	body: string;
	sentAt: string;
}

export interface MessageParticipant {
	id: string;
	name: string;
}

export interface MessageThread {
	id: string;
	title: string;
	context: "event" | "task" | "proposal" | "general";
	status: ResourceStatus;
	preview: string;
	unreadCount: number;
	updatedAt: string;
	participants: MessageParticipant[];
	messages: Message[];
}

export interface WorkspaceFile {
	id: string;
	name: string;
	fileType: string;
	ownerName: string;
	linkedResource: string;
	sizeLabel: string;
	updatedAt: string;
	uploadedBy?: string;
	uploadedAt?: string;
	mimeType?: string;
	url?: string;
	sizeBytes?: number;
}

export interface ActivityStats {
	tasksCompleted: number;
	tasksCompletedTrend: number;
	overdueTasks: number;
	volunteerHours: number;
	taskCompletionTrend: { date: string; count: number }[];
	openTasksByStatus: { status: string; count: number; percent: number }[];
	topContributors: {
		id: string;
		name: string;
		role: string;
		completedTasks: number;
		lastActive: string;
		status: "Active" | "Offline";
	}[];
}

export interface ModuleSettings {
	tasks: boolean;
	events: boolean;
	finance: boolean;
	volunteers: boolean;
}

export interface ApprovalRule {
	id: string;
	triggerType: string;
	triggerValue: string;
	approverIds: string;
}

export interface OrganizationSettings {
	orgType: string;
	primaryContact: string;
}

export interface Member {
	id: string;
	user: UserProfile;
	position: string;
	accessLabel: string;
	taskCount: number;
	volunteerHours: number;
	role?: UserRole;
}

export interface ActivityItem {
	id: string;
	actorName: string;
	action: string;
	resourceType: string;
	resourceTitle: string;
	occurredAt: string;
}

export interface DashboardData {
	metrics: DashboardMetric[];
	attention: Array<{
		id: string;
		label: string;
		title: string;
		owner: string;
		dueLabel: string;
		tone: "danger" | "tertiary" | "primary";
	}>;
	myTasks: Task[];
	upcomingEvents: EventItem[];
	recentActivity: ActivityItem[];
	stats?: ActivityStats;
}

export interface WorkspaceSettings {
	workspaceName: string;
	defaultVisibility: "members" | "officers" | "private";
	requireProposalApproval: boolean;
	allowMemberInvites: boolean;
	fiscalYearStart: string;
}

export interface FinanceSummary {
	totalRevenue: number;
	totalExpenses: number;
	netBalance: number;
	pendingCount: number;
}

export interface TrendDataPoint {
	date: string;
	revenue: number;
	expenses: number;
}

export interface NotificationItem {
	id: string;
	title: string;
	body: string;
	type: string;
	resourceType?: string;
	resourceId?: string;
	isRead: boolean;
	createdAt: string;
}

export interface SearchResult {
	id: string;
	type: "Task" | "Proposal" | "Event" | "File" | "Finance";
	title: string;
	description: string;
	status: string;
}

export interface ApprovalHistoryEntry {
	id: string;
	step: string;
	approver: string;
	action: "approved" | "rejected";
	comment?: string;
	createdAt: string;
}

export interface LeaderboardEntry {
	userId: string;
	displayName: string;
	xp: number;
	level: number;
	rank: number;
}

export interface KudosEntry {
	id: string;
	fromUser: string;
	toUser: string;
	message: string;
	createdAt: string;
}

export interface Meeting {
	id: string;
	title: string;
	date: string;
	time: string;
	location: string;
	description: string;
	agendaItems: string[];
	minutes: string;
	actionItems: string[];
	status: "scheduled" | "in_progress" | "completed" | "cancelled";
	organizerName: string;
	attendeeCount: number;
	rsvpStatus?: "yes" | "no" | "maybe";
}

export interface BudgetAllocation {
	id: string;
	title: string;
	amount: number;
	status: "requested" | "approved" | "spent" | "reconciled";
	linkedProposal: string;
	linkedProposalId?: string;
}

export interface TermArchive {
	id: string;
	termName: string;
	startDate: string;
	endDate: string;
	daysRemaining?: number;
	isActive?: boolean;
	summary?: TermSummary;
}

export interface TermSummary {
	totalTasksCompleted: number;
	eventsHeld: number;
	budgetSpent: number;
	volunteerHours: number;
}
