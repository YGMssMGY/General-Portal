import type {
  ActivityItem,
  DashboardData,
  EventItem,
  FinanceTransaction,
  Member,
  Message,
  MessageThread,
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
  getCurrentUser: () => fetchJson<UserProfile>("/auth/me"),
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
  getFiles: () => fetchPage<WorkspaceFile>("/files"),
  getMembers: () => fetchPage<Member>("/members"),
  getActivity: () => fetchPage<ActivityItem>("/activity"),
  getSettings: () => fetchJson<WorkspaceSettings>("/settings"),
  search: (query: string) => fetchJson<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),
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
  updateSettings: (settings: Partial<WorkspaceSettings>) =>
    fetchJson<WorkspaceSettings>("/settings", { method: "PATCH", ...jsonBody(settings) }),
};
