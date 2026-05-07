import { http, HttpResponse, delay } from "msw";
import {
  generateActivity,
  generateDashboardData,
  generateEvents,
  generateFiles,
  generateFinanceTransactions,
  generateMembers,
  generateMessages,
  generatePhotoGallery,
  generateProposals,
  generatePublicEvents,
  generateSearchResults,
  generateSettings,
  generateTasks,
  generateUserProfiles,
  generateVolunteerSlots,
  getCurrentRole,
  getCurrentUser,
  setCurrentRole,
} from "./data";
import type { UserRole } from "./data";

const SIMULATED_LATENCY_MS = 120;

let tasks = generateTasks();
let proposals = generateProposals();
let events = generateEvents();
let volunteerSlots = generateVolunteerSlots();
let financeTransactions = generateFinanceTransactions();
const { threads: messageThreads, msgs: messages } = generateMessages();
let files = generateFiles();
let members = generateMembers();
let activity = generateActivity();

function paginate<T>(items: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export const handlers = [
  http.get("/api/auth/me", async () => {
    await delay(SIMULATED_LATENCY_MS);
    return HttpResponse.json(getCurrentUser());
  }),

  http.post("/api/auth/role", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const body = (await request.json()) as { role: UserRole };
    setCurrentRole(body.role);
    return HttpResponse.json(getCurrentUser());
  }),

  http.get("/api/dashboard", async () => {
    await delay(SIMULATED_LATENCY_MS);
    return HttpResponse.json(generateDashboardData());
  }),

  http.get("/api/tasks", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 25;
    let filtered = tasks;
    if (status) {
      filtered = filtered.filter((t) => t.status === status);
    }
    return HttpResponse.json(paginate(filtered, page, pageSize));
  }),

  http.post("/api/tasks", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const body = (await request.json()) as Partial<typeof tasks[0]>;
    const newTask = {
      id: `task-${Date.now()}`,
      title: body.title || "Untitled",
      status: "todo" as const,
      priority: body.priority || "normal",
      project: body.project || "",
      dueDate: body.dueDate || new Date().toISOString().slice(0, 10),
      assigneeName: body.assigneeName || "Unassigned",
      progress: 0,
    };
    tasks = [newTask, ...tasks];
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.get("/api/proposals", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 25;
    return HttpResponse.json(paginate(proposals, page, pageSize));
  }),

  http.post("/api/proposals", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const body = (await request.json()) as Partial<typeof proposals[0]>;
    const newProposal = {
      id: `prop-${Date.now()}`,
      title: body.title || "New Proposal",
      type: body.type || "Event",
      status: "draft" as const,
      submittedBy: body.submittedBy || getCurrentUser().name,
      submittedAt: new Date().toISOString(),
      budget: body.budget || 0,
      summary: body.summary || "",
    };
    proposals = [newProposal, ...proposals];
    return HttpResponse.json(newProposal, { status: 201 });
  }),

  http.get("/api/events", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 25;
    return HttpResponse.json(paginate(events, page, pageSize));
  }),

  http.get("/api/events/public", async () => {
    await delay(SIMULATED_LATENCY_MS);
    return HttpResponse.json(generatePublicEvents());
  }),

  http.get("/api/volunteers/slots", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 25;
    return HttpResponse.json(paginate(volunteerSlots, page, pageSize));
  }),

  http.get("/api/finance/transactions", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 25;
    return HttpResponse.json(paginate(financeTransactions, page, pageSize));
  }),

  http.get("/api/messages/threads", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 20;
    return HttpResponse.json(paginate(messageThreads, page, pageSize));
  }),

  http.get("/api/messages/threads/:threadId", async ({ params }) => {
    await delay(SIMULATED_LATENCY_MS);
    const thread = messageThreads.find((t) => t.id === params.threadId);
    if (!thread) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(thread);
  }),

  http.get("/api/files", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 25;
    return HttpResponse.json(paginate(files, page, pageSize));
  }),

  http.get("/api/members", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 25;
    return HttpResponse.json(paginate(members, page, pageSize));
  }),

  http.get("/api/activity", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const pageSize = Number(url.searchParams.get("pageSize")) || 25;
    return HttpResponse.json(paginate(activity, page, pageSize));
  }),

  http.get("/api/settings", async () => {
    await delay(SIMULATED_LATENCY_MS);
    return HttpResponse.json(generateSettings());
  }),

  http.get("/api/search", async ({ request }) => {
    await delay(SIMULATED_LATENCY_MS);
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const results = generateSearchResults();
    if (q) {
      return HttpResponse.json(
        results.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q)
        )
      );
    }
    return HttpResponse.json(results);
  }),

  http.get("/api/photos", async () => {
    await delay(SIMULATED_LATENCY_MS);
    return HttpResponse.json(generatePhotoGallery());
  }),

  http.get("/api/workspace", async () => {
    await delay(SIMULATED_LATENCY_MS);
    return HttpResponse.json({
      id: "ws-main",
      name: "Developers' Club & Student Council",
      description: "Shared workspace for club management and student council activities.",
    });
  }),
];
