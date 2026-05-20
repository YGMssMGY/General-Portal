import { http, HttpResponse } from "msw";
import type { DashboardData, Task, Proposal, EventItem } from "../../../src/types";

const API = "http://localhost:3001/api";

function id(): string {
    return crypto.randomUUID();
}

const mockDashboardData: DashboardData = {
    metrics: [
        { label: "Open Tasks", value: "5", tone: "primary", icon: "Task" },
        { label: "Pending Proposals", value: "2", tone: "tertiary", icon: "Document" },
        { label: "Upcoming Events", value: "3", tone: "secondary", icon: "Calendar" },
        { label: "Volunteer Hours", value: "48", tone: "neutral", icon: "Time" },
    ],
    attention: [
        {
            id: id(),
            label: "Overdue",
            title: "Approve catering budget",
            owner: "Sarah Jenkins",
            dueLabel: "Past due",
            tone: "danger",
        },
    ],
    myTasks: [
        {
            id: id(),
            title: "Test Task",
            status: "todo",
            priority: "medium",
            project: "General",
            dueDate: new Date(Date.now() + 86400000).toISOString(),
            assigneeName: "Current User",
            progress: 0,
        },
    ],
    upcomingEvents: [],
    recentActivity: [],
};

const mockTasks: Task[] = [
    {
        id: id(),
        title: "Task One",
        status: "todo",
        priority: "high",
        project: "Project A",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assigneeName: "User One",
        progress: 0,
    },
    {
        id: id(),
        title: "Task Two",
        status: "in_progress",
        priority: "medium",
        project: "Project B",
        dueDate: new Date(Date.now() + 172800000).toISOString(),
        assigneeName: "User Two",
        progress: 50,
    },
];

const mockProposals: Proposal[] = [
    {
        id: id(),
        title: "Proposal One",
        type: "Event",
        status: "under_review",
        submittedBy: "User One",
        submittedAt: new Date(Date.now() - 86400000).toISOString(),
        budget: 1500,
        summary: "A test proposal.",
    },
];

const mockEvents: EventItem[] = [
    {
        id: id(),
        title: "Upcoming Event",
        status: "pending",
        startsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        endsAt: new Date(Date.now() + 7 * 86400000 + 7200000).toISOString(),
        progress: 0,
        budgetUsed: 0,
        budgetTotal: 2000,
        ownerNames: ["Organizer"],
    },
];

export const handlers = [
    // Health
    http.get(`${API}/health`, () => {
        return HttpResponse.json({ status: "ok", version: "0.1.0" });
    }),

    // Dashboard
    http.get(`${API}/dashboard`, () => {
        return HttpResponse.json(mockDashboardData);
    }),

    // Tasks
    http.get(`${API}/tasks`, ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);
        const total = mockTasks.length;
        return HttpResponse.json({
            content: mockTasks.slice((page - 1) * limit, page * limit),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }),

    http.post(`${API}/tasks`, async ({ request }) => {
        const body = (await request.json()) as Partial<Task>;
        return HttpResponse.json({ id: id(), ...body }, { status: 201 });
    }),

    http.patch(`${API}/tasks/:id`, async ({ params, request }) => {
        const body = (await request.json()) as Partial<Task>;
        return HttpResponse.json({ id: params.id, ...body });
    }),

    http.delete(`${API}/tasks/:id`, () => {
        return new HttpResponse(null, { status: 204 });
    }),

    // Proposals
    http.get(`${API}/proposals`, ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);
        const total = mockProposals.length;
        return HttpResponse.json({
            content: mockProposals.slice((page - 1) * limit, page * limit),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }),

    // Events
    http.get(`${API}/events`, ({ request }) => {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get("page") ?? "1", 10);
        const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);
        const total = mockEvents.length;
        return HttpResponse.json({
            content: mockEvents.slice((page - 1) * limit, page * limit),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    }),

    // Error cases
    http.get(`${API}/unauthorized`, () => {
        return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
    }),

    http.get(`${API}/forbidden`, () => {
        return HttpResponse.json({ error: "Forbidden" }, { status: 403 });
    }),

    http.get(`${API}/server-error`, () => {
        return HttpResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }),
];
