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

function authed(summary: string, extra?: Record<string, unknown>) {
    return {
        summary,
        security: [{ cookieAuth: [] }, { bearerAuth: SCOPES }],
        responses: {
            "200": {
                description: "Success envelope",
                content: {
                    "application/json": {
                        schema: { $ref: "#/components/schemas/Envelope" },
                    },
                },
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Forbidden" },
        },
        ...extra,
    };
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
        { name: "auth" },
        { name: "tasks" },
        { name: "events" },
        { name: "proposals" },
        { name: "budget" },
        { name: "finance" },
        { name: "meetings" },
        { name: "messages" },
        { name: "files" },
        { name: "notifications" },
        { name: "search" },
        { name: "webhooks" },
        { name: "api-tokens" },
        { name: "attendance" },
        { name: "approvals" },
        { name: "polls" },
        { name: "participation" },
        { name: "reports" },
        { name: "account" },
        { name: "audit" },
    ],
    paths: {
        "/api/auth/providers": {
            get: {
                tags: ["auth"],
                summary: "List enabled auth providers for the portal",
                responses: { "200": { description: "Providers and workspace" } },
            },
        },
        "/api/auth/password/login": {
            post: {
                tags: ["auth"],
                summary: "Sign in with email and password",
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
        "/api/me": {
            get: authed("Current user profile with locale", { tags: ["auth"] }),
        },
        "/api/account/sessions": {
            get: authed("List my active sessions", { tags: ["account"] }),
            delete: authed("Revoke one session by id, or all others without id", {
                tags: ["account"],
            }),
        },
        "/api/account/password": {
            put: authed("Change my password and rotate other sessions", {
                tags: ["account"],
            }),
        },
        "/api/tasks": {
            get: authed("List tasks (cursor paginated)", { tags: ["tasks"] }),
            post: authed("Create a task", { tags: ["tasks"] }),
        },
        "/api/tasks/{id}": {
            get: authed("Get a task", { tags: ["tasks"] }),
            put: authed("Update a task", { tags: ["tasks"] }),
            delete: authed("Delete a task", { tags: ["tasks"] }),
        },
        "/api/events": {
            get: authed("List events", { tags: ["events"] }),
            post: authed("Create an event", { tags: ["events"] }),
        },
        "/api/events/{id}": {
            get: authed("Get an event", { tags: ["events"] }),
            put: authed("Update an event", { tags: ["events"] }),
            delete: authed("Delete an event", { tags: ["events"] }),
        },
        "/api/proposals": {
            get: authed("List proposals", { tags: ["proposals"] }),
            post: authed("Create a proposal", { tags: ["proposals"] }),
        },
        "/api/budget": {
            get: authed("List budget allocations", { tags: ["budget"] }),
            post: authed("Create a budget allocation", { tags: ["budget"] }),
        },
        "/api/finance/transactions": {
            get: authed("List finance transactions", { tags: ["finance"] }),
            post: authed("Record a transaction", { tags: ["finance"] }),
        },
        "/api/finance/summary": {
            get: authed("Finance totals and balance", { tags: ["finance"] }),
        },
        "/api/meetings": {
            get: authed("List meetings", { tags: ["meetings"] }),
            post: authed("Schedule a meeting", { tags: ["meetings"] }),
        },
        "/api/meetings/{id}/rsvp": {
            post: authed("RSVP to a meeting", { tags: ["meetings"] }),
        },
        "/api/messages": {
            get: authed("List message threads", { tags: ["messages"] }),
            post: authed("Start a thread or reply", { tags: ["messages"] }),
        },
        "/api/files": {
            get: authed("List attachments", { tags: ["files"] }),
            post: authed("Upload a file", { tags: ["files"] }),
        },
        "/api/links": {
            get: authed("List link items", { tags: ["files"] }),
            post: authed("Save a link", { tags: ["files"] }),
        },
        "/api/notifications": {
            get: authed("List my notifications", { tags: ["notifications"] }),
        },
        "/api/notification-prefs": {
            get: authed("List my notification preferences", { tags: ["notifications"] }),
            put: authed("Update notification preferences", { tags: ["notifications"] }),
        },
        "/api/search": {
            get: authed("Full-portal search", { tags: ["search"] }),
        },
        "/api/webhooks": {
            get: authed("List webhooks (manage_webhooks)", { tags: ["webhooks"] }),
            post: authed("Create a webhook", { tags: ["webhooks"] }),
        },
        "/api/api-tokens": {
            get: authed("List API tokens (manage_api_tokens)", { tags: ["api-tokens"] }),
            post: authed("Create an API token with scopes", { tags: ["api-tokens"] }),
        },
        "/api/attendance": {
            get: authed("List attendance records", { tags: ["attendance"] }),
            post: authed("Check in with a code", { tags: ["attendance"] }),
        },
        "/api/approvals": {
            get: authed("List approvals", { tags: ["approvals"] }),
            post: authed("Decide an approval", { tags: ["approvals"] }),
        },
        "/api/polls": {
            get: authed("List polls", { tags: ["polls"] }),
            post: authed("Create a poll", { tags: ["polls"] }),
        },
        "/api/participation": {
            get: authed("Participation scores and leaderboard", { tags: ["participation"] }),
        },
        "/api/reports": {
            get: authed("List reports", { tags: ["reports"] }),
            post: authed("Generate a report", { tags: ["reports"] }),
        },
        "/api/audit": {
            get: authed("Query the audit log (view_audit)", { tags: ["audit"] }),
        },
        "/api/audit/export": {
            get: authed("Download the audit log as CSV", { tags: ["audit"] }),
        },
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
