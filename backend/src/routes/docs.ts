import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";

const route = new Hono();

const spec = {
  openapi: "3.1.0",
  info: {
    title: "General Portal API",
    version: "0.1.0",
    description:
      "REST API for the General Portal student council / club management dashboard.",
  },
  servers: [{ url: "http://localhost:3001", description: "Development" }],
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
          "200": { description: "User profile" },
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
        responses: { "200": { description: "Array of tasks" } },
      },
      post: {
        summary: "Create task",
        operationId: "createTask",
        tags: ["Tasks"],
        responses: { "201": { description: "Created task" } },
      },
    },
    "/api/tasks/{id}": {
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
    "/api/proposals": {
      get: {
        summary: "List proposals",
        operationId: "listProposals",
        tags: ["Proposals"],
        responses: { "200": { description: "Array of proposals" } },
      },
      post: {
        summary: "Create proposal",
        operationId: "createProposal",
        tags: ["Proposals"],
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
    "/api/events": {
      get: {
        summary: "List events",
        operationId: "listEvents",
        tags: ["Events"],
        responses: { "200": { description: "Array of events" } },
      },
      post: {
        summary: "Create event",
        operationId: "createEvent",
        tags: ["Events"],
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
        summary: "Update slot",
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
        summary: "Delete slot",
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
        responses: { "201": { description: "Created transaction" } },
      },
    },
    "/api/finance/transactions/{id}": {
      patch: {
        summary: "Update transaction",
        operationId: "updateTransaction",
        tags: ["Finance"],
        responses: { "200": { description: "Updated transaction" } },
      },
      delete: {
        summary: "Delete transaction",
        operationId: "deleteTransaction",
        tags: ["Finance"],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/api/messages/threads": {
      get: {
        summary: "List message threads",
        operationId: "listThreads",
        tags: ["Messages"],
        responses: { "200": { description: "Array of threads" } },
      },
      post: {
        summary: "Create thread",
        operationId: "createThread",
        tags: ["Messages"],
        responses: { "201": { description: "Created thread" } },
      },
    },
    "/api/messages/threads/{id}/reply": {
      post: {
        summary: "Reply to thread",
        operationId: "replyToThread",
        tags: ["Messages"],
        responses: { "201": { description: "Created reply" } },
      },
    },
    "/api/messages/threads/{id}": {
      delete: {
        summary: "Archive thread",
        operationId: "archiveThread",
        tags: ["Messages"],
        responses: { "204": { description: "Archived" } },
      },
    },
    "/api/files": {
      get: {
        summary: "List workspace files",
        operationId: "listFiles",
        tags: ["Files"],
        responses: { "200": { description: "Array of files" } },
      },
    },
    "/api/files/{id}": {
      delete: {
        summary: "Delete file",
        operationId: "deleteFile",
        tags: ["Files"],
        responses: { "204": { description: "Deleted" } },
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
        responses: { "200": { description: "Updated member" } },
      },
      delete: {
        summary: "Remove member",
        operationId: "removeMember",
        tags: ["Members"],
        responses: { "204": { description: "Removed" } },
      },
    },
    "/api/activity": {
      get: {
        summary: "List activity log",
        operationId: "listActivity",
        tags: ["Activity"],
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
  },
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
