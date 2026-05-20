import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";

const route = new Hono();

const spec = {
	openapi: "3.1.0",
	info: {
		title: "General Portal API",
		version: "0.2.0",
		description:
			"REST API for the General Portal student council / club management dashboard.\n\nAuthentication uses Auth.js with JWT strategy. Most endpoints require a valid session cookie or Bearer token.",
	},
	servers: [
		{ url: "http://localhost:3001", description: "Development" },
		{ url: "/", description: "Production (same-origin)" },
	],
	paths: {
		"/api/health": {
			get: {
				summary: "Health check",
				operationId: "health",
				tags: ["System"],
				responses: { "200": { description: "OK" } },
			},
		},
		"/api/me": {
			get: {
				summary: "Get current user profile",
				operationId: "getMe",
				tags: ["Auth"],
				responses: {
					"200": {
						description: "User profile with role, permissions, workspace",
					},
					"401": { description: "Not authenticated" },
				},
			},
		},
		"/api/auth/session": {
			get: {
				summary: "Get Auth.js session",
				operationId: "getSession",
				tags: ["Auth"],
				responses: { "200": { description: "Session data" } },
			},
		},
		"/api/auth/signin": {
			post: {
				summary: "Sign in with credentials",
				operationId: "signIn",
				tags: ["Auth"],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									email: { type: "string", format: "email" },
									password: { type: "string" },
								},
								required: ["email", "password"],
							},
						},
					},
				},
				responses: { "200": { description: "Sign in result" } },
			},
		},
		"/api/auth/csrf": {
			get: {
				summary: "Get CSRF token",
				operationId: "getCsrf",
				tags: ["Auth"],
				responses: { "200": { description: "CSRF token" } },
			},
		},
		"/api/dashboard": {
			get: {
				summary: "Get dashboard data",
				operationId: "getDashboard",
				tags: ["Dashboard"],
				responses: {
					"200": {
						description: "Dashboard with metrics, tasks, events, activity",
					},
				},
			},
		},
		"/api/tasks": {
			get: {
				summary: "List tasks",
				operationId: "listTasks",
				tags: ["Tasks"],
				parameters: [
					{ name: "status", in: "query", schema: { type: "string" } },
					{ name: "search", in: "query", schema: { type: "string" } },
					{
						name: "page",
						in: "query",
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", default: 50 },
					},
					{ name: "sort", in: "query", schema: { type: "string" } },
					{
						name: "order",
						in: "query",
						schema: { type: "string", enum: ["asc", "desc"] },
					},
				],
				responses: { "200": { description: "Array of tasks" } },
			},
			post: {
				summary: "Create task",
				operationId: "createTask",
				tags: ["Tasks"],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									title: { type: "string" },
									status: {
										type: "string",
										enum: ["todo", "in_progress", "blocked", "done"],
									},
									priority: { type: "string", enum: ["low", "medium", "high"] },
									project: { type: "string" },
									dueDate: { type: "string", format: "date-time" },
									assigneeName: { type: "string" },
									progress: { type: "integer" },
								},
								required: ["title"],
							},
						},
					},
				},
				responses: { "201": { description: "Created task" } },
			},
		},
		"/api/tasks/{id}": {
			get: {
				summary: "Get task by ID",
				operationId: "getTask",
				tags: ["Tasks"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Task details" } },
			},
			patch: {
				summary: "Update task",
				operationId: "updateTask",
				tags: ["Tasks"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Updated task" } },
			},
			delete: {
				summary: "Delete task",
				operationId: "deleteTask",
				tags: ["Tasks"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Deleted" } },
			},
		},
		"/api/tasks/{taskId}/subtasks": {
			get: {
				summary: "List subtasks",
				operationId: "listSubtasks",
				tags: ["Tasks"],
				parameters: [
					{
						name: "taskId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Array of subtasks" } },
			},
			post: {
				summary: "Create subtask",
				operationId: "createSubtask",
				tags: ["Tasks"],
				parameters: [
					{
						name: "taskId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "201": { description: "Created subtask" } },
			},
		},
		"/api/tasks/{taskId}/comments": {
			get: {
				summary: "List task comments",
				operationId: "listTaskComments",
				tags: ["Tasks"],
				parameters: [
					{
						name: "taskId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Array of comments" } },
			},
			post: {
				summary: "Add comment to task",
				operationId: "createTaskComment",
				tags: ["Tasks"],
				parameters: [
					{
						name: "taskId",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "201": { description: "Created comment" } },
			},
		},
		"/api/proposals": {
			get: {
				summary: "List proposals",
				operationId: "listProposals",
				tags: ["Proposals"],
				parameters: [
					{ name: "status", in: "query", schema: { type: "string" } },
					{ name: "type", in: "query", schema: { type: "string" } },
				],
				responses: { "200": { description: "Array of proposals" } },
			},
			post: {
				summary: "Create proposal",
				operationId: "createProposal",
				tags: ["Proposals"],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									title: { type: "string" },
									type: {
										type: "string",
										enum: ["Event", "Purchase", "Project"],
									},
									summary: { type: "string" },
									budget: { type: "number" },
									submittedBy: { type: "string" },
								},
								required: ["title", "type", "submittedBy"],
							},
						},
					},
				},
				responses: { "201": { description: "Created proposal" } },
			},
		},
		"/api/proposals/{id}": {
			patch: {
				summary: "Update proposal",
				operationId: "updateProposal",
				tags: ["Proposals"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Updated proposal" } },
			},
			delete: {
				summary: "Delete proposal",
				operationId: "deleteProposal",
				tags: ["Proposals"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Deleted" } },
			},
		},
		"/api/proposals/{id}/approve": {
			post: {
				summary: "Approve a proposal step",
				operationId: "approveProposal",
				tags: ["Proposals"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Approved" } },
			},
		},
		"/api/proposals/{id}/reject": {
			post: {
				summary: "Reject a proposal",
				operationId: "rejectProposal",
				tags: ["Proposals"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									reason: { type: "string" },
								},
								required: ["reason"],
							},
						},
					},
				},
				responses: { "200": { description: "Rejected" } },
			},
		},
		"/api/events": {
			get: {
				summary: "List events",
				operationId: "listEvents",
				tags: ["Events"],
				parameters: [
					{ name: "status", in: "query", schema: { type: "string" } },
					{
						name: "dateFrom",
						in: "query",
						schema: { type: "string", format: "date-time" },
					},
				],
				responses: {
					"200": { description: "Array of events with ownerNames" },
				},
			},
			post: {
				summary: "Create event",
				operationId: "createEvent",
				tags: ["Events"],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									title: { type: "string" },
									status: { type: "string" },
									startsAt: { type: "string", format: "date-time" },
									endsAt: { type: "string", format: "date-time" },
									ownerNames: { type: "array", items: { type: "string" } },
								},
								required: ["title"],
							},
						},
					},
				},
				responses: { "201": { description: "Created event" } },
			},
		},
		"/api/events/{id}": {
			patch: {
				summary: "Update event",
				operationId: "updateEvent",
				tags: ["Events"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Updated event" } },
			},
			delete: {
				summary: "Delete event",
				operationId: "deleteEvent",
				tags: ["Events"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Deleted" } },
			},
		},
		"/api/volunteers/slots": {
			get: {
				summary: "List volunteer slots",
				operationId: "listSlots",
				tags: ["Volunteers"],
				responses: { "200": { description: "Array of slots" } },
			},
			post: {
				summary: "Create volunteer slot",
				operationId: "createSlot",
				tags: ["Volunteers"],
				responses: { "201": { description: "Created slot" } },
			},
		},
		"/api/volunteers/slots/{id}": {
			patch: {
				summary: "Update volunteer slot",
				operationId: "updateSlot",
				tags: ["Volunteers"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Updated slot" } },
			},
			delete: {
				summary: "Delete volunteer slot",
				operationId: "deleteSlot",
				tags: ["Volunteers"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Deleted" } },
			},
		},
		"/api/finance/transactions": {
			get: {
				summary: "List finance transactions",
				operationId: "listTransactions",
				tags: ["Finance"],
				responses: { "200": { description: "Array of transactions" } },
			},
			post: {
				summary: "Create transaction",
				operationId: "createTransaction",
				tags: ["Finance"],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									title: { type: "string" },
									category: {
										type: "string",
										enum: ["Printing", "Event", "Food", "Supplies", "Other"],
									},
									submittedBy: { type: "string" },
									amount: { type: "number" },
									notes: { type: "string" },
								},
								required: ["title", "category", "submittedBy"],
							},
						},
					},
				},
				responses: { "201": { description: "Created transaction" } },
			},
		},
		"/api/finance/transactions/{id}": {
			patch: {
				summary: "Update transaction",
				operationId: "updateTransaction",
				tags: ["Finance"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Updated transaction" } },
			},
			delete: {
				summary: "Delete transaction",
				operationId: "deleteTransaction",
				tags: ["Finance"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Deleted" } },
			},
		},
		"/api/finance/summary": {
			get: {
				summary: "Get finance summary",
				operationId: "getFinanceSummary",
				tags: ["Finance"],
				responses: {
					"200": { description: "Revenue, expenses, balance summary" },
				},
			},
		},
		"/api/finance/trends": {
			get: {
				summary: "Get finance trends",
				operationId: "getFinanceTrends",
				tags: ["Finance"],
				parameters: [
					{
						name: "days",
						in: "query",
						schema: { type: "integer", default: 7 },
					},
				],
				responses: { "200": { description: "Trend data with snapshots" } },
			},
		},
		"/api/messages/threads": {
			get: {
				summary: "List message threads",
				operationId: "listThreads",
				tags: ["Messages"],
				responses: {
					"200": {
						description: "Array of threads with participants and messages",
					},
				},
			},
			post: {
				summary: "Create message thread",
				operationId: "createThread",
				tags: ["Messages"],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									title: { type: "string" },
									participants: { type: "array", items: { type: "string" } },
									body: { type: "string" },
									authorName: { type: "string" },
									context: { type: "string" },
								},
							},
						},
					},
				},
				responses: { "201": { description: "Created thread" } },
			},
		},
		"/api/messages/threads/{id}/reply": {
			post: {
				summary: "Reply to thread",
				operationId: "replyToThread",
				tags: ["Messages"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				requestBody: {
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									body: { type: "string" },
									authorName: { type: "string" },
								},
								required: ["body"],
							},
						},
					},
				},
				responses: { "201": { description: "Created reply" } },
			},
		},
		"/api/messages/threads/{id}": {
			delete: {
				summary: "Archive or delete thread",
				operationId: "archiveThread",
				tags: ["Messages"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Archived" } },
			},
		},
		"/api/messages/threads/{id}/read": {
			patch: {
				summary: "Mark thread as read",
				operationId: "markThreadRead",
				tags: ["Messages"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Marked read" } },
			},
		},
		"/api/files": {
			get: {
				summary: "List workspace files",
				operationId: "listFiles",
				tags: ["Files"],
				parameters: [{ name: "type", in: "query", schema: { type: "string" } }],
				responses: { "200": { description: "Array of files" } },
			},
			post: {
				summary: "Upload a file",
				operationId: "uploadFile",
				tags: ["Files"],
				requestBody: {
					content: {
						"multipart/form-data": {
							schema: {
								type: "object",
								properties: {
									file: { type: "string", format: "binary" },
									ownerName: { type: "string" },
								},
							},
						},
					},
				},
				responses: { "201": { description: "Uploaded file record" } },
			},
		},
		"/api/files/{id}": {
			delete: {
				summary: "Delete file",
				operationId: "deleteFile",
				tags: ["Files"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Deleted" } },
			},
		},
		"/api/files/{id}/download": {
			get: {
				summary: "Download file",
				operationId: "downloadFile",
				tags: ["Files"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "File binary" } },
			},
		},
		"/api/members": {
			get: {
				summary: "List members",
				operationId: "listMembers",
				tags: ["Members"],
				responses: { "200": { description: "Array of members" } },
			},
		},
		"/api/members/{id}": {
			patch: {
				summary: "Update member",
				operationId: "updateMember",
				tags: ["Members"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Updated member" } },
			},
			delete: {
				summary: "Remove member",
				operationId: "removeMember",
				tags: ["Members"],
				parameters: [
					{
						name: "id",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "204": { description: "Removed" } },
			},
		},
		"/api/activity": {
			get: {
				summary: "List activity log",
				operationId: "listActivity",
				tags: ["Activity"],
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", default: 50 },
					},
				],
				responses: { "200": { description: "Array of activity entries" } },
			},
		},
		"/api/search": {
			get: {
				summary: "Search across resources",
				operationId: "search",
				tags: ["Search"],
				parameters: [
					{
						name: "q",
						in: "query",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: { "200": { description: "Search results" } },
			},
		},
		"/api/settings": {
			get: {
				summary: "Get workspace settings",
				operationId: "getSettings",
				tags: ["Settings"],
				responses: { "200": { description: "Workspace settings" } },
			},
			patch: {
				summary: "Update workspace settings",
				operationId: "updateSettings",
				tags: ["Settings"],
				responses: { "200": { description: "Updated settings" } },
			},
		},
		"/api/events/public": {
			get: {
				summary: "List public events",
				operationId: "listPublicEvents",
				tags: ["Public"],
				responses: { "200": { description: "Array of public events" } },
			},
		},
		"/api/photos": {
			get: {
				summary: "List photos",
				operationId: "listPhotos",
				tags: ["Public"],
				responses: { "200": { description: "Array of photos" } },
			},
		},
		"/api/audit": {
			get: {
				summary: "List audit log entries",
				operationId: "listAuditLog",
				tags: ["Audit"],
				parameters: [
					{
						name: "page",
						in: "query",
						schema: { type: "integer", default: 1 },
					},
					{
						name: "limit",
						in: "query",
						schema: { type: "integer", default: 50 },
					},
					{ name: "resourceType", in: "query", schema: { type: "string" } },
					{ name: "actorName", in: "query", schema: { type: "string" } },
					{
						name: "startDate",
						in: "query",
						schema: { type: "string", format: "date-time" },
					},
					{
						name: "endDate",
						in: "query",
						schema: { type: "string", format: "date-time" },
					},
				],
				responses: { "200": { description: "Paginated audit log entries" } },
			},
		},
		"/api/audit/export": {
			get: {
				summary: "Export audit log as CSV",
				operationId: "exportAuditLog",
				tags: ["Audit"],
				parameters: [
					{ name: "resourceType", in: "query", schema: { type: "string" } },
					{ name: "actorName", in: "query", schema: { type: "string" } },
					{
						name: "startDate",
						in: "query",
						schema: { type: "string", format: "date-time" },
					},
					{
						name: "endDate",
						in: "query",
						schema: { type: "string", format: "date-time" },
					},
				],
				responses: { "200": { description: "CSV file" } },
			},
		},
		"/api/presence": {
			get: {
				summary: "Get online users",
				operationId: "getPresence",
				tags: ["System"],
				responses: { "200": { description: "Online user IDs" } },
			},
		},
		"/api/notifications": {
			get: {
				summary: "List notifications",
				operationId: "listNotifications",
				tags: ["Notifications"],
				responses: { "200": { description: "Array of notifications" } },
			},
		},
		"/api/gamification": {
			get: {
				summary: "Get gamification data",
				operationId: "getGamification",
				tags: ["Gamification"],
				responses: { "200": { description: "XP, level, streak, leaderboard" } },
			},
		},
		"/api/kudos": {
			get: {
				summary: "List kudos",
				operationId: "listKudos",
				tags: ["Gamification"],
				responses: { "200": { description: "Array of kudos" } },
			},
			post: {
				summary: "Send kudos",
				operationId: "sendKudos",
				tags: ["Gamification"],
				responses: { "201": { description: "Created kudos" } },
			},
		},
		"/api/budget": {
			get: {
				summary: "List budget allocations",
				operationId: "listBudgetAllocations",
				tags: ["Finance"],
				responses: { "200": { description: "Array of budget allocations" } },
			},
		},
		"/api/meetings": {
			get: {
				summary: "List meetings",
				operationId: "listMeetings",
				tags: ["Meetings"],
				responses: { "200": { description: "Array of meetings" } },
			},
		},
		"/api/archive": {
			get: {
				summary: "List term archives",
				operationId: "listArchives",
				tags: ["Archive"],
				responses: { "200": { description: "Array of term archives" } },
			},
		},
	},
	components: {
		securitySchemes: {
			sessionCookie: {
				type: "apiKey",
				in: "cookie",
				name: "authjs.session-token",
				description: "Auth.js session cookie (set after sign-in)",
			},
			bearerAuth: {
				type: "http",
				scheme: "bearer",
				bearerFormat: "JWT",
			},
		},
		schemas: {
			ApiError: {
				type: "object",
				properties: {
					success: { type: "boolean", enum: [false] },
					error: {
						type: "object",
						properties: {
							message: { type: "string" },
							code: { type: "string" },
							details: {},
						},
					},
				},
			},
			PaginationMeta: {
				type: "object",
				properties: {
					total: { type: "integer" },
					page: { type: "integer" },
					limit: { type: "integer" },
					totalPages: { type: "integer" },
				},
			},
		},
	},
	security: [{ sessionCookie: [] }, { bearerAuth: [] }],
};

route.get("/openapi.json", (c) => {
	return c.json(spec);
});

route.get(
	"/docs",
	apiReference({
		spec: { content: spec },
		pageTitle: "General Portal API Reference",
	}),
);

export default route;
