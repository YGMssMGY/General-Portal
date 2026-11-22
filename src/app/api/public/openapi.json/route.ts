const SCOPES = [
    "read",
    "write",
    "tasks:read",
    "tasks:write",
    "events:read",
    "events:write",
    "finance:read",
    "finance:write",
    "members:read",
    "admin",
];

function envelopeRef() {
    return {
        description: "Success envelope",
        content: {
            "application/json": {
                schema: { $ref: "#/components/schemas/Envelope" },
            },
        },
    };
}

function authed(summary: string, extra?: Record<string, unknown>) {
    return {
        summary,
        security: [{ cookieAuth: [] }, { bearerAuth: SCOPES }],
        responses: {
            "200": envelopeRef(),
            "401": {
                description: "Unauthorized",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                    },
                },
            },
            "403": {
                description: "Forbidden",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Error" },
                    },
                },
            },
        },
        ...extra,
    };
}

function publicOp(summary: string, tags: string[]) {
    return {
        tags,
        summary,
        security: [],
        responses: { "200": envelopeRef() },
    };
}

function family(tag: string, methods: Record<string, string>) {
    const item: Record<string, unknown> = {};
    for (const [method, summary] of Object.entries(methods)) {
        item[method] = authed(summary, { tags: [tag] });
    }
    return item;
}

function publicFamily(tag: string, methods: Record<string, string>) {
    const item: Record<string, unknown> = {};
    for (const [method, summary] of Object.entries(methods)) {
        item[method] = publicOp(summary, [tag]);
    }
    return item;
}

const doc = {
    openapi: "3.0.0",
    info: {
        title: "General Portal API",
        version: "2.0.0",
        description:
            "Workspace-scoped REST API. Every request resolves the portal database from the `portal` cookie. Responses use the { success, data } envelope and cursor pagination via the X-Next-Cursor header.",
    },
    servers: [{ url: "/" }],
    "x-token-scopes": SCOPES,
    security: [{ cookieAuth: [] }],
    tags: [
        { name: "account" },
        { name: "activity" },
        { name: "admin" },
        { name: "api-tokens" },
        { name: "approvals" },
        { name: "assets" },
        { name: "attendance" },
        { name: "audit" },
        { name: "auth" },
        { name: "budget" },
        { name: "calendar" },
        { name: "cooperation" },
        { name: "dashboard" },
        { name: "decisions" },
        { name: "dues" },
        { name: "events" },
        { name: "finance" },
        { name: "files" },
        { name: "goals" },
        { name: "health" },
        { name: "invitations" },
        { name: "kudos" },
        { name: "links" },
        { name: "me" },
        { name: "meetings" },
        { name: "members" },
        { name: "messages" },
        { name: "minutes" },
        { name: "my-work" },
        { name: "notification-prefs" },
        { name: "notifications" },
        { name: "participation" },
        { name: "polls" },
        { name: "proposals" },
        { name: "public" },
        { name: "purchase-requests" },
        { name: "reactions" },
        { name: "reports" },
        { name: "saved-views" },
        { name: "search" },
        { name: "settings" },
        { name: "showcase" },
        { name: "subgroups" },
        { name: "tasks" },
        { name: "time" },
        { name: "trash" },
        { name: "volunteers" },
        { name: "webhooks" },
        { name: "workflows" },
        { name: "workspace" },
    ],
    paths: {
        "/api/auth/providers": {
            get: {
                tags: ["auth"],
                summary: "List enabled auth providers for the portal",
                security: [],
                responses: { "200": { description: "Providers and workspace" } },
            },
        },
        "/api/auth/password/login": {
            post: {
                tags: ["auth"],
                summary: "Sign in with email and password",
                security: [],
                responses: {
                    "200": { description: "Sets session cookie" },
                    "401": { description: "Invalid credentials" },
                },
            },
        },
        "/api/auth/logout": {
            post: {
                tags: ["auth"],
                summary: "Revoke the current session",
                responses: { "200": { description: "Signed out" } },
            },
        },
        "/api/auth/me": {
            get: authed("Current user, role and permissions", { tags: ["auth"] }),
        },
        "/api/me": family("me", { get: "Current user profile with locale" }),
        "/api/me/prefs": family("me", {
            get: "Get my preferences",
            put: "Update my preferences",
        }),
        "/api/workspace": family("workspace", { get: "Current workspace and portal config" }),
        "/api/health": {
            get: {
                tags: ["health"],
                summary: "Service health and version",
                security: [],
                responses: { "200": { description: "Health status" } },
            },
        },
        "/api/public/portals": publicFamily("public", { get: "List seeded portals" }),
        "/api/public/showcase": publicFamily("showcase", {
            get: "Cross-portal public events, galleries and announcements",
        }),
        "/api/public/openapi.json": {
            get: {
                tags: ["public"],
                summary: "This OpenAPI description",
                security: [],
                responses: { "200": { description: "OpenAPI document" } },
            },
        },
        "/api/account/sessions": family("account", {
            get: "List my active sessions",
            delete: "Revoke one session by id, or all others without id",
        }),
        "/api/account/password": family("account", {
            put: "Change my password and rotate other sessions",
        }),
        "/api/activity": family("activity", { get: "List recent workspace activity" }),
        "/api/admin/users": family("admin", {
            get: "List workspace users",
            post: "Create a workspace user",
        }),
        "/api/api-tokens": family("api-tokens", {
            get: "List API tokens (manage_api_tokens)",
            post: "Create an API token with scopes",
        }),
        "/api/api-tokens/{id}": family("api-tokens", { delete: "Revoke an API token" }),
        "/api/approvals": family("approvals", {
            get: "List approvals",
            post: "Decide an approval",
        }),
        "/api/approvals/{id}": family("approvals", { post: "Decide a specific approval" }),
        "/api/assets": family("assets", {
            get: "List assets",
            post: "Register an asset",
        }),
        "/api/assets/{id}": family("assets", {
            put: "Update an asset",
            delete: "Remove an asset",
        }),
        "/api/assets/{id}/loans": family("assets", {
            get: "List loan records for an asset",
            post: "Lend an asset to a member",
        }),
        "/api/assets/loans/{loanId}/return": family("assets", {
            post: "Return a loaned asset",
        }),
        "/api/attendance": family("attendance", {
            get: "List attendance records",
            post: "Check in with a code",
        }),
        "/api/attendance/record": family("attendance", {
            post: "Record attendance for a meeting",
        }),
        "/api/attendance/rate": family("attendance", { get: "Attendance rate summary" }),
        "/api/audit": family("audit", { get: "Query the audit log (view_audit)" }),
        "/api/audit/export": family("audit", { get: "Download the audit log as CSV" }),
        "/api/budget": family("budget", {
            get: "List budget allocations",
            post: "Create a budget allocation",
        }),
        "/api/budget/overview": family("budget", { get: "Budget totals by category" }),
        "/api/budget/{id}": family("budget", {
            get: "Get a budget allocation",
            put: "Update a budget allocation",
            delete: "Delete a budget allocation",
        }),
        "/api/budget/{id}/approve": family("budget", { post: "Approve a budget allocation" }),
        "/api/budget/{id}/reconcile": family("budget", { post: "Reconcile a budget allocation" }),
        "/api/budget/{id}/spend": family("budget", { post: "Spend from a budget allocation" }),
        "/api/calendar": family("calendar", { get: "Combined events and meetings calendar" }),
        "/api/calendar/ical": {
            get: {
                tags: ["calendar"],
                summary: "iCalendar feed; token-only via ?token= with calendar:read scope",
                security: [],
                responses: { "200": { description: "text/calendar feed" } },
            },
        },
        "/api/cooperation": family("cooperation", {
            get: "List cooperation requests",
            post: "Create a cooperation request",
        }),
        "/api/cooperation/{id}": family("cooperation", {
            get: "Get a cooperation request",
            put: "Update a cooperation request",
            delete: "Delete a cooperation request",
        }),
        "/api/cooperation/{id}/review": family("cooperation", {
            post: "Review a cooperation request",
        }),
        "/api/dashboard": family("dashboard", { get: "Dashboard counters and highlights" }),
        "/api/decisions": family("decisions", {
            get: "List decisions",
            post: "Record a decision",
        }),
        "/api/decisions/{id}": family("decisions", {
            put: "Update a decision",
            delete: "Delete a decision",
        }),
        "/api/dues": family("dues", {
            get: "List dues",
            post: "Create a due",
        }),
        "/api/dues/{id}": family("dues", {
            post: "Mark a due as paid",
            delete: "Delete a due",
        }),
        "/api/events": family("events", {
            get: "List events (cursor paginated)",
            post: "Create an event",
        }),
        "/api/events/{id}": family("events", {
            get: "Get an event",
            put: "Update an event",
            delete: "Delete an event",
        }),
        "/api/events/{id}/approve": family("events", { post: "Approve an event" }),
        "/api/events/{id}/reject": family("events", { post: "Reject an event" }),
        "/api/events/{id}/register": family("events", {
            get: "List registrations for an event",
            post: "Register for an event",
            delete: "Cancel my registration",
        }),
        "/api/events/annual-plan": family("events", {
            get: "List annual plan entries",
            post: "Create an annual plan entry",
        }),
        "/api/events/annual-plan/{id}": family("events", {
            get: "Get an annual plan entry",
            put: "Update an annual plan entry",
            delete: "Delete an annual plan entry",
        }),
        "/api/events/annual-plan/{id}/link": family("events", {
            post: "Link an annual plan entry to an event",
        }),
        "/api/events/teams-post/{id}": family("events", {
            post: "Publish an event teams post",
        }),
        "/api/finance/summary": family("finance", { get: "Finance totals and balance" }),
        "/api/finance/trends": family("finance", { get: "Income and expense trends" }),
        "/api/finance/transactions": family("finance", {
            get: "List finance transactions",
            post: "Record a transaction",
        }),
        "/api/finance/transactions/{id}": family("finance", {
            delete: "Delete a transaction",
        }),
        "/api/files": family("files", {
            get: "List attachments",
            post: "Upload a file",
        }),
        "/api/files/{id}": family("files", {
            patch: "Update file metadata",
            delete: "Delete a file",
        }),
        "/api/files/{id}/versions": family("files", {
            get: "List file versions",
            post: "Upload a new version",
        }),
        "/api/files/download/{id}": family("files", { get: "Download a file" }),
        "/api/goals": family("goals", {
            get: "List goals",
            post: "Create a goal",
        }),
        "/api/goals/{id}": family("goals", {
            get: "Get a goal",
            put: "Update a goal",
            delete: "Delete a goal",
        }),
        "/api/goals/{id}/progress": family("goals", { post: "Record goal progress" }),
        "/api/invitations": family("invitations", {
            get: "List invitations",
            post: "Invite a member",
        }),
        "/api/invitations/{id}": family("invitations", { delete: "Revoke an invitation" }),
        "/api/kudos": family("kudos", {
            get: "List kudos",
            post: "Send kudos",
        }),
        "/api/kudos/{id}": family("kudos", { delete: "Delete kudos" }),
        "/api/kudos/leaderboard": family("kudos", { get: "Kudos leaderboard" }),
        "/api/links": family("links", {
            get: "List link items",
            post: "Save a link",
        }),
        "/api/links/{id}": family("links", {
            get: "Get a link item",
            delete: "Delete a link item",
        }),
        "/api/meetings": family("meetings", {
            get: "List meetings",
            post: "Schedule a meeting",
        }),
        "/api/meetings/{id}": family("meetings", {
            get: "Get a meeting",
            put: "Update a meeting",
            delete: "Delete a meeting",
        }),
        "/api/meetings/{id}/agenda": family("meetings", {
            get: "List agenda items",
            post: "Add an agenda item",
        }),
        "/api/meetings/{id}/code": family("meetings", { post: "Rotate the meeting code" }),
        "/api/meetings/{id}/minutes": family("meetings", {
            get: "List meeting minutes",
            post: "Add meeting minutes",
        }),
        "/api/meetings/{id}/rsvp": family("meetings", {
            post: "RSVP to a meeting",
            delete: "Cancel my RSVP",
        }),
        "/api/meetings/{id}/rsvps": family("meetings", { get: "List RSVPs for a meeting" }),
        "/api/members": family("members", { get: "List members (cursor paginated)" }),
        "/api/members/{id}": family("members", {
            get: "Get a member",
            put: "Update a member",
            delete: "Remove a member",
        }),
        "/api/members/history": family("members", {
            get: "List membership history",
            post: "Add a membership history entry",
        }),
        "/api/members/history/{id}": family("members", {
            put: "Update a membership history entry",
            delete: "Delete a membership history entry",
        }),
        "/api/messages": family("messages", {
            get: "List message threads",
            post: "Start a thread or reply",
        }),
        "/api/messages/threads/{id}": family("messages", {
            get: "Get a message thread",
            delete: "Delete a message thread",
        }),
        "/api/messages/threads/{id}/reply": family("messages", {
            post: "Reply to a message thread",
        }),
        "/api/messages/threads/{id}/read": family("messages", {
            post: "Mark a message thread as read",
        }),
        "/api/minutes/{id}": family("minutes", {
            put: "Update meeting minutes",
            delete: "Delete meeting minutes",
        }),
        "/api/minutes/{id}/action-items": family("minutes", {
            post: "Add an action item to minutes",
        }),
        "/api/my-work": family("my-work", { get: "My assigned tasks and upcoming items" }),
        "/api/notification-prefs": family("notification-prefs", {
            get: "List my notification preferences",
            put: "Update notification preferences",
        }),
        "/api/notifications": family("notifications", {
            get: "List my notifications (X-Unread-Count header)",
        }),
        "/api/notifications/{id}/read": family("notifications", {
            post: "Mark one notification as read",
        }),
        "/api/notifications/read-all": family("notifications", {
            post: "Mark all notifications as read",
        }),
        "/api/participation": family("participation", {
            get: "Participation scores and leaderboard",
        }),
        "/api/participation/leaderboard": family("participation", {
            get: "Participation leaderboard",
        }),
        "/api/polls": family("polls", {
            get: "List polls",
            post: "Create a poll",
        }),
        "/api/polls/{id}": family("polls", {
            get: "Get a poll",
            put: "Update a poll",
            delete: "Delete a poll",
        }),
        "/api/polls/{id}/vote": family("polls", { post: "Vote on a poll" }),
        "/api/proposals": family("proposals", {
            get: "List proposals",
            post: "Create a proposal",
        }),
        "/api/proposals/{id}": family("proposals", {
            get: "Get a proposal",
            put: "Update a proposal",
            delete: "Delete a proposal",
        }),
        "/api/proposals/{id}/approve": family("proposals", { post: "Approve a proposal" }),
        "/api/proposals/{id}/reject": family("proposals", { post: "Reject a proposal" }),
        "/api/proposals/{id}/attachments": family("proposals", {
            get: "List proposal attachments",
            post: "Attach a file to a proposal",
        }),
        "/api/proposals/templates": family("proposals", {
            get: "List proposal templates",
            post: "Create a proposal template",
        }),
        "/api/proposals/templates/{id}": family("proposals", {
            get: "Get a proposal template",
            put: "Update a proposal template",
            delete: "Delete a proposal template",
        }),
        "/api/purchase-requests": family("purchase-requests", {
            get: "List purchase requests",
            post: "Create a purchase request",
        }),
        "/api/purchase-requests/{id}": family("purchase-requests", {
            get: "Get a purchase request",
            delete: "Delete a purchase request",
        }),
        "/api/purchase-requests/{id}/review": family("purchase-requests", {
            post: "Review a purchase request",
        }),
        "/api/reactions": family("reactions", {
            get: "List reactions",
            post: "Add a reaction",
        }),
        "/api/reports": family("reports", {
            get: "List reports",
            post: "Generate a report",
        }),
        "/api/saved-views": family("saved-views", {
            get: "List saved views",
            post: "Create a saved view",
        }),
        "/api/saved-views/{id}": family("saved-views", {
            put: "Update a saved view",
            delete: "Delete a saved view",
        }),
        "/api/search": family("search", { get: "Full-portal search (?q=)" }),
        "/api/settings": family("settings", {
            get: "Get workspace settings",
            put: "Update workspace settings",
        }),
        "/api/showcase": family("showcase", {
            get: "List showcase items",
            post: "Create a showcase item",
        }),
        "/api/showcase/{id}": family("showcase", {
            patch: "Update a showcase item",
            put: "Replace a showcase item",
            delete: "Delete a showcase item",
        }),
        "/api/showcase/reorder": family("showcase", { put: "Reorder showcase items" }),
        "/api/subgroups": family("subgroups", {
            get: "List subgroups",
            post: "Create a subgroup",
        }),
        "/api/subgroups/{id}": family("subgroups", {
            get: "Get a subgroup",
            put: "Update a subgroup",
            delete: "Delete a subgroup",
        }),
        "/api/subgroups/{id}/members": family("subgroups", {
            get: "List subgroup members",
            post: "Add a subgroup member",
            delete: "Remove subgroup members",
        }),
        "/api/subgroups/{id}/members/{userId}": family("subgroups", {
            delete: "Remove one subgroup member",
        }),
        "/api/subgroups/{id}/broadcast": family("subgroups", {
            post: "Broadcast a message to a subgroup",
        }),
        "/api/tasks": family("tasks", {
            get: "List tasks (cursor paginated)",
            post: "Create a task",
        }),
        "/api/tasks/{id}": family("tasks", {
            get: "Get a task",
            put: "Update a task",
            delete: "Delete a task",
        }),
        "/api/tasks/{id}/subtasks": family("tasks", {
            get: "List subtasks",
            post: "Create a subtask",
            delete: "Delete a subtask",
        }),
        "/api/tasks/{id}/comments": family("tasks", {
            get: "List task comments",
            post: "Add a task comment",
            delete: "Delete a task comment",
        }),
        "/api/tasks/{id}/attachments": family("tasks", {
            get: "List task attachments",
            post: "Attach a file to a task",
        }),
        "/api/tasks/occurrences": family("tasks", { get: "List recurring task occurrences" }),
        "/api/tasks/time": family("time", {
            get: "List time entries",
            post: "Log time against a task",
        }),
        "/api/trash": family("trash", {
            get: "List soft-deleted items",
            post: "Purge selected items",
            delete: "Purge all trashed items",
        }),
        "/api/trash/restore": family("trash", { post: "Restore soft-deleted items" }),
        "/api/volunteers": family("volunteers", {
            get: "List volunteers",
            post: "Sign up as a volunteer",
        }),
        "/api/volunteers/slots": family("volunteers", {
            get: "List volunteer slots",
            put: "Create or update a volunteer slot",
            delete: "Delete a volunteer slot",
        }),
        "/api/volunteers/signups": family("volunteers", {
            get: "List volunteer signups",
            post: "Sign up for a slot",
            delete: "Cancel a volunteer signup",
        }),
        "/api/volunteers/hours": family("volunteers", { get: "Volunteer hours by member" }),
        "/api/volunteers/stats": family("volunteers", { get: "Volunteer program statistics" }),
        "/api/webhooks": family("webhooks", {
            get: "List webhooks (manage_webhooks)",
            post: "Create a webhook",
        }),
        "/api/webhooks/{id}": family("webhooks", {
            put: "Update a webhook",
            delete: "Delete a webhook",
        }),
        "/api/webhooks/{id}/test": family("webhooks", { post: "Send a test delivery" }),
        "/api/workflows": family("workflows", {
            get: "List workflows",
            post: "Create a workflow",
        }),
        "/api/workflows/{id}": family("workflows", {
            get: "Get a workflow",
            put: "Update a workflow",
            delete: "Delete a workflow",
        }),
    },
    components: {
        securitySchemes: {
            cookieAuth: { type: "apiKey", in: "cookie", name: "gp_session" },
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                description: `API token via Authorization: Bearer header. Scopes: ${SCOPES.join(", ")}.`,
            },
        },
        schemas: {
            Envelope: {
                type: "object",
                required: ["success"],
                properties: {
                    success: { type: "boolean" },
                    data: { description: "Payload on success" },
                    error: { type: "string", description: "Message on failure" },
                },
            },
            Error: {
                type: "object",
                required: ["success", "error"],
                properties: {
                    success: { type: "boolean", enum: [false] },
                    error: { type: "string" },
                },
            },
            Page: {
                type: "object",
                properties: {
                    items: { type: "array", items: { type: "object" } },
                    nextCursor: {
                        type: "string",
                        nullable: true,
                        description: "Pass as ?cursor=; mirrored in X-Next-Cursor header",
                    },
                },
            },
        },
        parameters: {
            Cursor: {
                name: "cursor",
                in: "query",
                schema: { type: "string" },
                description: "Opaque cursor from X-Next-Cursor",
            },
            Limit: {
                name: "limit",
                in: "query",
                schema: { type: "integer", default: 50, maximum: 100 },
            },
        },
    },
};

export async function GET() {
    return Response.json(doc, {
        headers: { "Cache-Control": "public, max-age=300" },
    });
}
