import type {
    DashboardData,
    DashboardMetric,
    Task,
    EventItem,
    Proposal,
    VolunteerSlot,
    FinanceTransaction,
    ActivityItem,
    UserProfile,
} from "../../src/types";

function id(): string {
    return crypto.randomUUID();
}

export function buildTaskItem(overrides?: Partial<Task>): Task {
    return {
        id: id(),
        title: "Test Task",
        status: "todo",
        priority: "medium",
        project: "Test Project",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assigneeName: "Test User",
        progress: 0,
        ...overrides,
    };
}

export function buildEventItem(overrides?: Partial<EventItem>): EventItem {
    return {
        id: id(),
        title: "Test Event",
        status: "pending",
        startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        endsAt: undefined,
        progress: 0,
        budgetUsed: 0,
        budgetTotal: 0,
        ownerNames: ["Test Owner"],
        ...overrides,
    };
}

export function buildProposal(overrides?: Partial<Proposal>): Proposal {
    return {
        id: id(),
        title: "Test Proposal",
        type: "Event",
        status: "submitted",
        submittedBy: "Test User",
        submittedAt: new Date().toISOString(),
        budget: 500,
        summary: "A test proposal.",
        ...overrides,
    };
}

export function buildVolunteerSlot(overrides?: Partial<VolunteerSlot>): VolunteerSlot {
    return {
        id: id(),
        title: "Test Volunteer Slot",
        eventName: "Test Event",
        startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        capacity: 10,
        filled: 3,
        hours: 4,
        ...overrides,
    };
}

export function buildFinanceTransaction(
    overrides?: Partial<FinanceTransaction>,
): FinanceTransaction {
    return {
        id: id(),
        title: "Test Transaction",
        category: "Other",
        status: "pending",
        submittedBy: "Test User",
        amount: 100,
        occurredAt: new Date().toISOString(),
        ...overrides,
    };
}

export function buildActivityItem(overrides?: Partial<ActivityItem>): ActivityItem {
    return {
        id: id(),
        actorName: "Test User",
        action: "created a task",
        resourceType: "Task",
        resourceTitle: "Test Task",
        occurredAt: new Date().toISOString(),
        ...overrides,
    };
}

export function buildMetric(overrides?: Partial<DashboardMetric>): DashboardMetric {
    return {
        label: "Open Tasks",
        value: "5",
        tone: "primary",
        icon: "Task",
        ...overrides,
    };
}

export function buildDashboardData(overrides?: Partial<DashboardData>): DashboardData {
    return {
        metrics: [buildMetric()],
        attention: [],
        myTasks: [],
        upcomingEvents: [],
        recentActivity: [],
        stats: {
            tasksCompleted: 12,
            tasksCompletedTrend: 2,
            overdueTasks: 1,
            volunteerHours: 48,
            taskCompletionTrend: [
                { date: "2026-05-01", count: 3 },
                { date: "2026-05-02", count: 5 },
            ],
            openTasksByStatus: [
                { status: "todo", count: 4, percent: 40 },
                { status: "in_progress", count: 3, percent: 30 },
            ],
            topContributors: [
                {
                    id: id(),
                    name: "Test User",
                    role: "Member",
                    completedTasks: 10,
                    lastActive: new Date().toISOString(),
                    status: "Active",
                },
            ],
        },
        ...overrides,
    };
}

export function buildUserProfile(overrides?: Partial<UserProfile>): UserProfile {
    return {
        id: id(),
        email: "test@example.edu",
        displayName: "Test User",
        role: "member",
        workspaceName: "Test Workspace",
        permissions: [],
        xp: 0,
        level: 1,
        streak: 0,
        ...overrides,
    };
}
