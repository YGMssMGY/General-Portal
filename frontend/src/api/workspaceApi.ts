import type {
  ActivityItem,
  DashboardData,
  EventItem,
  FinanceTransaction,
  Member,
  MessageThread,
  Proposal,
  SearchResult,
  Task,
  UserProfile,
  VolunteerSlot,
  WorkspaceFile,
  WorkspaceSettings
} from "../types";
import { API_ORIGIN, fetchJson, jsonBody } from "./httpClient";

export const workspaceApi = {
  getCurrentUser: () => fetchJson<UserProfile>("/auth/me"),
  getDashboard: () => fetchJson<DashboardData>("/dashboard"),
  getTasks: () => fetchJson<Task[]>("/tasks"),
  createTask: (task: Pick<Task, "title" | "priority" | "project" | "dueDate" | "assigneeName">) =>
    fetchJson<Task>("/tasks", { method: "POST", ...jsonBody(task) }),
  getProposals: () => fetchJson<Proposal[]>("/proposals"),
  createProposal: (proposal: Pick<Proposal, "title" | "type" | "submittedBy" | "budget" | "summary">) =>
    fetchJson<Proposal>("/proposals", { method: "POST", ...jsonBody(proposal) }),
  getEvents: () => fetchJson<EventItem[]>("/events"),
  getVolunteerSlots: () => fetchJson<VolunteerSlot[]>("/volunteers/slots"),
  getFinanceTransactions: () => fetchJson<FinanceTransaction[]>("/finance/transactions"),
  getMessageThreads: () => fetchJson<MessageThread[]>("/messages/threads"),
  getFiles: () => fetchJson<WorkspaceFile[]>("/files"),
  getMembers: () => fetchJson<Member[]>("/members"),
  getActivity: () => fetchJson<ActivityItem[]>("/activity"),
  getSettings: () => fetchJson<WorkspaceSettings>("/settings"),
  search: (query: string) => fetchJson<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`),
  getMicrosoftLoginUrl: () => `${API_ORIGIN}/oauth2/authorization/microsoft`
};
