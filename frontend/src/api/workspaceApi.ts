import type {
  ActivityItem,
  ActivityStats,
  ApprovalRule,
  DashboardData,
  EventItem,
  FinanceTransaction,
  Member,
  Message,
  MessageThread,
  ModuleSettings,
  Proposal,
  SearchResult,
  Task,
  UserProfile,
  VolunteerSlot,
  WorkspaceFile,
  WorkspaceSettings,
} from "../types";
import { API_BASE_URL, fetchJson, fetchPage, jsonBody } from "./httpClient";

export const workspaceApi = {
  getCurrentUser: () => fetchJson<UserProfile>("/me"),
  getDashboard: () => fetchJson<DashboardData>("/dashboard"),
  getTasks: () => fetchPage<Task>("/tasks"),
  createTask: (task: Pick<Task, "title" | "priority" | "project" | "dueDate" | "assigneeName">) =>
    fetchJson<Task>("/tasks", { method: "POST", ...jsonBody(task) }),
  getProposals: () => fetchPage<Proposal>("/proposals"),
  createProposal: (
    proposal: Pick<Proposal, "title" | "type" | "submittedBy" | "budget" | "summary">,
  ) => fetchJson<Proposal>("/proposals", { method: "POST", ...jsonBody(proposal) }),
  getEvents: () => fetchPage<EventItem>("/events"),
  getVolunteerSlots: () => fetchPage<VolunteerSlot>("/volunteers/slots"),
  getFinanceTransactions: () => fetchPage<FinanceTransaction>("/finance/transactions"),
  getMessageThreads: () => fetchPage<MessageThread>("/messages/threads"),
  getFiles: (type?: string) =>
    fetchPage<WorkspaceFile>(type ? `/files?type=${encodeURIComponent(type)}` : "/files"),
  uploadFile: (formData: FormData) =>
    fetchJson<WorkspaceFile>("/files", { method: "POST", body: formData }),
  getFileDownloadUrl: (id: string) => `${API_BASE_URL}/files/${id}/download`,
  getMembers: () => fetchPage<Member>("/members"),
  getActivity: () => fetchPage<ActivityItem>("/activity"),
  getActivityStats: () => fetchJson<ActivityStats>("/activity/stats"),
  getSettings: () => fetchJson<WorkspaceSettings>("/settings"),
  search: (query: string, type?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams({ q: query });
    if (type && type !== "All") params.set("type", type);
    if (limit != null) params.set("limit", String(limit));
    if (offset != null) params.set("offset", String(offset));
    return fetchJson<SearchResult[]>(`/search?${params.toString()}`);
  },
  getModules: () => fetchJson<ModuleSettings>("/modules"),
  updateModule: (module: string, enabled: boolean) =>
    fetchJson<ModuleSettings>("/modules", {
      method: "PATCH",
      ...jsonBody({ [module]: enabled }),
    }),
  getApprovalRules: () => fetchPage<ApprovalRule>("/modules/rules"),
  createApprovalRule: (rule: Pick<ApprovalRule, "triggerType" | "triggerValue" | "approvers">) =>
    fetchJson<ApprovalRule>("/modules/rules", { method: "POST", ...jsonBody(rule) }),
  deleteApprovalRule: (id: string) => fetchJson<void>(`/modules/rules/${id}`, { method: "DELETE" }),
  uploadLogo: (formData: FormData) =>
    fetchJson<{ url: string }>("/workspace/logo", { method: "POST", body: formData }),
  getWorkspaceLogo: () => fetchJson<{ url: string }>("/workspace/logo"),
  getMicrosoftLoginUrl: () => `${API_BASE_URL}/oauth2/authorization/microsoft`,
  updateTask: (id: string, updates: Partial<Task>) =>
    fetchJson<Task>(`/tasks/${id}`, { method: "PATCH", ...jsonBody(updates) }),
  deleteTask: (id: string) => fetchJson<void>(`/tasks/${id}`, { method: "DELETE" }),
  createEvent: (event: Pick<EventItem, "title" | "startsAt" | "status">) =>
    fetchJson<EventItem>("/events", { method: "POST", ...jsonBody(event) }),
  updateEvent: (id: string, updates: Partial<EventItem>) =>
    fetchJson<EventItem>(`/events/${id}`, { method: "PATCH", ...jsonBody(updates) }),
  deleteEvent: (id: string) => fetchJson<void>(`/events/${id}`, { method: "DELETE" }),
  updateProposal: (id: string, updates: Partial<Proposal>) =>
    fetchJson<Proposal>(`/proposals/${id}`, { method: "PATCH", ...jsonBody(updates) }),
  deleteProposal: (id: string) => fetchJson<void>(`/proposals/${id}`, { method: "DELETE" }),
  createVolunteerSlot: (
    slot: Pick<VolunteerSlot, "title" | "eventName" | "capacity" | "filled" | "startsAt" | "hours">,
  ) => fetchJson<VolunteerSlot>("/volunteers/slots", { method: "POST", ...jsonBody(slot) }),
  updateVolunteerSlot: (id: string, updates: Partial<VolunteerSlot>) =>
    fetchJson<VolunteerSlot>(`/volunteers/slots/${id}`, { method: "PATCH", ...jsonBody(updates) }),
  deleteVolunteerSlot: (id: string) =>
    fetchJson<void>(`/volunteers/slots/${id}`, { method: "DELETE" }),
  createFinanceTransaction: (
    tx: Pick<FinanceTransaction, "title" | "category" | "amount" | "status" | "submittedBy">,
  ) => fetchJson<FinanceTransaction>("/finance/transactions", { method: "POST", ...jsonBody(tx) }),
  updateFinanceTransaction: (id: string, updates: Partial<FinanceTransaction>) =>
    fetchJson<FinanceTransaction>(`/finance/transactions/${id}`, {
      method: "PATCH",
      ...jsonBody(updates),
    }),
  deleteFinanceTransaction: (id: string) =>
    fetchJson<void>(`/finance/transactions/${id}`, { method: "DELETE" }),
  sendMessage: (
    thread: Pick<MessageThread, "title" | "context" | "participants"> & { body: string },
  ) => fetchJson<MessageThread>("/messages/threads", { method: "POST", ...jsonBody(thread) }),
  replyToThread: (threadId: string, body: string) =>
    fetchJson<Message>(`/messages/threads/${threadId}/reply`, {
      method: "POST",
      ...jsonBody({ body }),
    }),
  archiveThread: (threadId: string) =>
    fetchJson<void>(`/messages/threads/${threadId}`, { method: "DELETE" }),
  deleteFile: (id: string) => fetchJson<void>(`/files/${id}`, { method: "DELETE" }),
  updateMember: (id: string, updates: Partial<Member>) =>
    fetchJson<Member>(`/members/${id}`, { method: "PATCH", ...jsonBody(updates) }),
  removeMember: (id: string) => fetchJson<void>(`/members/${id}`, { method: "DELETE" }),
  getVolunteerStats: () =>
    fetchJson<{
      totalHoursThisMonth: number;
      activeVolunteers: number;
      topContributor: { name: string; hours: number };
    }>("/volunteers/stats"),
  getSlotSignups: (slotId: string) =>
    fetchJson<Array<{ id: string; userId: string; userName: string; status: string }>>(
      `/volunteers/slots/${slotId}/signups`,
    ),
  createSlotSignup: (slotId: string, userId: string) =>
    fetchJson<void>(`/volunteers/slots/${slotId}/signups`, {
      method: "POST",
      ...jsonBody({ userId }),
    }),
  searchMembers: (params: { q?: string; limit?: number; offset?: number }) =>
    fetchJson<{ members: Member[]; total: number }>(
      `/members?${new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null)) as Record<
          string,
          string
        >,
      ).toString()}`,
    ),
  getRoles: () =>
    fetchJson<
      Array<{
        id: string;
        name: string;
        description: string;
        count: number;
        permissions: string[];
      }>
    >("/roles"),
  createRole: (role: { name: string; description: string; permissions: string[] }) =>
    fetchJson<void>("/roles", { method: "POST", ...jsonBody(role) }),
  markThreadRead: (threadId: string) =>
    fetchJson<void>(`/messages/threads/${threadId}/read`, { method: "PATCH" }),
  getFinanceSummary: () => fetchJson<any>("/finance/summary"),
  getFinanceTrends: (days: number) => fetchJson<any[]>(`/finance/trends?days=${days}`),
  updateSettings: (settings: Partial<WorkspaceSettings>) =>
    fetchJson<WorkspaceSettings>("/settings", { method: "PATCH", ...jsonBody(settings) }),
  createAdminUser: (data: { email: string; displayName: string; password: string; role: string }) =>
    fetchJson<void>("/admin/users", { method: "POST", ...jsonBody(data) }),
};
